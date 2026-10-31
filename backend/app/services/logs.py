"""Experiment log entries.

Two kinds, both derived from recorded files (nothing is invented):
  event  - controller events from the M2 log (failed probes, failover, install, recovery, errors).
           Routine "destination reachable" probes are not listed - there are hundreds of them.
  record - one entry per result file that states its own outcome (benchmark, validation, M0 test).
"""
from __future__ import annotations

import re
from datetime import datetime

from ..config import Settings
from ..schemas import LogEntry, LogsResponse
from . import benchmarks as benchmarks_service
from . import failover as failover_service
from .data_reader import SourceTracker, utc_now

_SEV = {
    "probe_failed": "warn", "failover_started": "warn", "p2_installed": "ok", "recovery_verified": "ok",
    "recovery_failed": "error", "error": "error", "timeout": "error", "run_started": "info", "run_completed": "info",
}
_PING = re.compile(r"(\d+) packets transmitted, (\d+) received, ([\d.]+)% packet loss")
_RTT = re.compile(r"rtt min/avg/max/mdev = [\d.]+/([\d.]+)/([\d.]+)/")


def _sort_key(e: LogEntry) -> str:
    return (e.timestamp or "").ljust(23, "0")


def _m2_events(settings: Settings, tr_out: list[str]) -> list[LogEntry]:
    fo = failover_service.build(settings)
    tr_out.extend(fo.warnings)
    out: list[LogEntry] = []
    log = fo.source_log or ""
    tr = SourceTracker(settings.data_dir)
    rel = log.split("src/results/", 1)[-1] if log else None
    text = tr.text(rel, required=False) if rel else None
    if not text:
        return out
    for run in failover_service.parse_runs(text):
        for i, ev in enumerate(run.events):
            out.append(LogEntry(
                id=f"m2-r{run.run_id}-{i}", timestamp=ev.timestamp, category="M2", kind="event",
                severity=_SEV.get(ev.kind, "info"),  # type: ignore[arg-type]
                message=f"[run {run.run_id}] {ev.message}", source_file=log,
            ))
    return out


def _records(settings: Settings, warnings: list[str]) -> list[LogEntry]:
    tr = SourceTracker(settings.data_dir)
    out: list[LogEntry] = []

    # Final benchmark - described from the recomputed numbers.
    bm = benchmarks_service.build(settings)
    warnings.extend(bm.warnings)
    if bm.latest:
        run = bm.latest
        bits = ", ".join(f"{m.id} {m.packet_loss_percent:g}% loss" for m in run.modes)
        first = run.modes[0]
        out.append(LogEntry(
            id="rec-benchmark", timestamp=run.run_date, category="Benchmark", kind="record",
            severity="ok" if all(m.packets_lost == 0 for m in run.modes) else "warn",
            message=f"Final benchmark: {', '.join(m.id for m in run.modes)} - {first.trials} trials x {first.transmitted // first.trials:,} packets each ({bits})",
            source_file=first.source_file,
        ))

    # M1 path validation (final)
    rel = "final/path_validation_20261031.txt"
    if (t := tr.text(rel, required=False)):
        date = re.search(r"Date:\s*(\d{4}-\d{2}-\d{2})", t)
        parts = []
        for pid in ("P1", "P2"):
            blk = re.search(rf"{pid}:.*?Packets:\s*(\d+) transmitted,\s*(\d+) received.*?Average RTT:\s*([\d.]+) ms", t, re.S)
            if blk:
                parts.append(f"{pid} {blk.group(2)}/{blk.group(1)} received, avg {blk.group(3)} ms")
        if parts:
            out.append(LogEntry(id="rec-m1-validation", timestamp=date.group(1) if date else None, category="M1", kind="record",
                                severity="ok", message="Path validation: " + "; ".join(parts), source_file=tr.display(rel)))

    # M0 validation
    rel = "final/m0_validation_20261031.txt"
    if (t := tr.text(rel, required=False)):
        stamp = None
        if (m := re.search(r"\b\w{3} (\w{3}) (\d{1,2}) (\d{1,2}:\d{2}:\d{2}) (AM|PM) UTC (\d{4})", t)):
            try:
                stamp = datetime.strptime(f"{m.group(5)} {m.group(1)} {m.group(2)} {m.group(3)} {m.group(4)}", "%Y %b %d %I:%M:%S %p").strftime("%Y-%m-%d %H:%M:%S") + " UTC"
            except ValueError:
                stamp = None
        p, r = _PING.search(t), _RTT.search(t)
        if p:
            msg = f"OSPFv3 route check and connectivity test: {p.group(2)}/{p.group(1)} received, {p.group(3)}% loss" + (f", avg {r.group(1)} ms" if r else "")
            out.append(LogEntry(id="rec-m0-validation", timestamp=stamp, category="M0", kind="record",
                                severity="ok" if float(p.group(3)) == 0 else "warn", message=msg, source_file=tr.display(rel)))

    # M0 failure test summary
    rel = "m0_summary.txt"
    if (t := tr.text(rel, required=False)):
        ts = re.search(r"Failure injection timestamp:\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)", t)
        tx, rx = re.search(r"Packets transmitted:\s*(\d+)", t), re.search(r"Packets received:\s*(\d+)", t)
        if ts and tx and rx:
            out.append(LogEntry(id="rec-m0-failure", timestamp=ts.group(1), category="M0", kind="record",
                                severity="ok" if tx.group(1) == rx.group(1) else "warn",
                                message=f"R2-R5 link failure test: OSPFv3 rerouted; {rx.group(1)}/{tx.group(1)} packets received (preliminary smoke test, not the final benchmark)",
                                source_file=tr.display(rel)))
    warnings.extend(tr.warnings)
    return out


def build(settings: Settings, *, limit: int = 100, severity: str | None = None,
          category: str | None = None, kind: str | None = None) -> LogsResponse:
    warnings: list[str] = []
    entries = _records(settings, warnings) + _m2_events(settings, warnings)
    files = sorted({e.source_file for e in entries})
    if severity:
        entries = [e for e in entries if e.severity == severity]
    if category:
        entries = [e for e in entries if e.category.lower() == category.lower()]
    if kind:
        entries = [e for e in entries if e.kind == kind]
    entries.sort(key=_sort_key, reverse=True)  # newest first; entries without a timestamp sort last
    total = len(entries)
    shown = entries[:limit]
    return LogsResponse(
        data_source={"kind": "historical" if files else "unavailable", "live_telemetry": False,  # type: ignore[arg-type]
                     "description": "Entries derived from recorded result files; not a live log stream.",
                     "files": files, "missing_files": [], "last_modified": None},
        generated_at=utc_now(), warnings=list(dict.fromkeys(warnings)),
        total_available=total, returned=len(shown), entries=shown,
        notes=["Timestamps are shown as written in the source files (VM clock). Only the M0 validation file states a time zone (UTC).",
               "Routine successful probes in the M2 log are not listed."],
    )
