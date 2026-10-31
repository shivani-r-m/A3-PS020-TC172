"""M2 failover measurements parsed from the controller log written by scripts/40_m2_failover.sh.

The log is an append-only file holding several controller runs (including aborted and
failed ones). Every run is parsed; the most recent run that verified recovery is reported
as the headline trial. No aggregate statistics are computed: the evidence is a single
measured trial, and the response says so explicitly.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from ..config import Settings
from ..schemas import (
    FailoverEvent,
    FailoverMetrics,
    FailoverResponse,
    FailoverRun,
    FailoverSummaryCheck,
    HeadlineTrial,
    PingVerification,
)
from .data_reader import SourceTracker, num, seconds_between, short_ts, utc_now

_START = re.compile(r"M2 Failover Monitor Started: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)")
_DONE = re.compile(r"M2 Failover Monitor Completed: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)")
_EVENT = re.compile(
    r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+) "
    r"(SUCCESS|FAILURE|FAILOVER|P2 INSTALLED|RECOVERY SUCCESS|RECOVERY FAILED|ERROR|TIMEOUT)(?::\s*(.*))?$"
)
_PROBE = re.compile(r"Probe (\d+)/(\d+)")
_PING = re.compile(r"(\d+) packets transmitted, (\d+) (?:packets )?received.*?([\d.]+)% packet loss")
_RTT = re.compile(r"rtt min/avg/max/mdev = ([\d.]+)/([\d.]+)/([\d.]+)/([\d.]+) ms")
_KIND = {
    "FAILURE": "probe_failed", "FAILOVER": "failover_started", "P2 INSTALLED": "p2_installed",
    "RECOVERY SUCCESS": "recovery_verified", "RECOVERY FAILED": "recovery_failed",
    "ERROR": "error", "TIMEOUT": "timeout",
}


@dataclass
class _Run:
    run_id: int
    started: str
    completed: str | None = None
    events: list[FailoverEvent] = field(default_factory=list)
    ok_before_failure: int = 0
    seen_failure: bool = False
    streak_start: str | None = None
    probe_failures: int = 0
    attempts: int = 0
    errors: int = 0
    timeout: bool = False
    first_failed: str | None = None
    triggered: str | None = None
    installed: str | None = None
    recovered: str | None = None
    threshold: int | None = None
    verification: PingVerification | None = None
    _ping_tx: tuple[int, int, float] | None = None


def parse_runs(text: str) -> list[_Run]:
    runs: list[_Run] = []
    cur: _Run | None = None
    for line in text.splitlines():
        line = line.strip()
        if (m := _START.search(line)):
            cur = _Run(run_id=len(runs) + 1, started=m.group(1))
            runs.append(cur)
            cur.events.append(FailoverEvent(timestamp=short_ts(m.group(1)), kind="run_started", message="M2 failover monitor started"))
            continue
        if cur is None:
            continue
        if (m := _DONE.search(line)):
            cur.completed = m.group(1)
            cur.events.append(FailoverEvent(timestamp=short_ts(m.group(1)), kind="run_completed", message="M2 failover monitor completed"))
            continue
        if (m := _EVENT.match(line)):
            ts, tag, rest = m.group(1), m.group(2), (m.group(3) or "").strip()
            if tag == "SUCCESS":
                cur.streak_start = None
                if not cur.seen_failure:
                    cur.ok_before_failure += 1
                continue
            if tag == "FAILURE":
                cur.seen_failure = True
                cur.probe_failures += 1
                pm = _PROBE.search(rest)
                if pm:
                    cur.threshold = int(pm.group(2))
                if cur.streak_start is None or (pm and int(pm.group(1)) == 1):
                    cur.streak_start = ts
            elif tag == "FAILOVER":
                cur.attempts += 1
                if cur.triggered is None:
                    cur.triggered = ts
                    cur.first_failed = cur.streak_start
            elif tag == "P2 INSTALLED" and cur.installed is None:
                cur.installed = ts
            elif tag == "RECOVERY SUCCESS" and cur.recovered is None:
                cur.recovered = ts
            elif tag == "ERROR":
                cur.errors += 1
            elif tag == "TIMEOUT":
                cur.timeout = True
            cur.events.append(FailoverEvent(timestamp=short_ts(ts), kind=_KIND[tag], message=rest or tag.title()))
            continue
        # ping statistics printed by the verification step (only after P2 was installed)
        if cur.installed is not None and cur.verification is None:
            if (m := _PING.search(line)):
                cur._ping_tx = (int(m.group(1)), int(m.group(2)), float(m.group(3)))
            elif (m := _RTT.search(line)) and cur._ping_tx:
                tx, rx, loss = cur._ping_tx
                cur.verification = PingVerification(
                    transmitted=tx, received=rx, packet_loss_percent=loss,
                    rtt_min_ms=float(m.group(1)), rtt_avg_ms=float(m.group(2)),
                    rtt_max_ms=float(m.group(3)), rtt_mdev_ms=float(m.group(4)),
                )
    return runs


def _metrics(r: _Run) -> FailoverMetrics | None:
    if not (r.first_failed and r.triggered):
        return None
    return FailoverMetrics(
        detection_time_s=seconds_between(r.first_failed, r.triggered),
        path_installation_time_s=seconds_between(r.triggered, r.installed),
        first_fail_to_install_s=seconds_between(r.first_failed, r.installed),
        first_fail_to_recovery_s=seconds_between(r.first_failed, r.recovered),
        install_to_recovery_s=seconds_between(r.installed, r.recovered),
    )


def _outcome(r: _Run) -> str:
    if r.recovered:
        return "recovered"
    if r.timeout:
        return "timeout"
    if r.attempts and r.errors and not r.installed:
        return "install_failed"
    if r.installed:
        return "installed_unverified"
    if r.attempts == 0 and r.probe_failures:
        return "no_failover"
    return "incomplete"


def _summary_check(tr: SourceTracker, headline: _Run | None) -> FailoverSummaryCheck | None:
    rel = "m2/failover_summary.txt"
    text = tr.text(rel, required=False)
    if text is None or headline is None:
        return None
    pats = {
        "first_fail_to_install_s": r"First failed probe to P2 installation:\s*([\d.]+)",
        "first_fail_to_recovery_s": r"First failed probe to recovery verification:\s*([\d.]+)",
        "install_to_recovery_s": r"P2 installation to recovery verification:\s*([\d.]+)",
    }
    expected = {k: v for k, p in pats.items() if (m := re.search(p, text)) and (v := num(m.group(1))) is not None}
    m = _metrics(headline)
    if not expected or m is None:
        return None
    computed = {k: getattr(m, k) for k in expected if getattr(m, k) is not None}
    ok = set(expected) == set(computed) and all(abs(expected[k] - computed[k]) < 0.0015 for k in expected)
    return FailoverSummaryCheck(file=tr.display(rel), matches=ok, expected=expected, computed=computed)


def _failure_link(tr: SourceTracker) -> str | None:
    for rel in ("m2/failover_summary.txt", "m0_summary.txt"):
        text = tr.text(rel, required=False)
        if text and (m := re.search(r"\b(R\d)\s*[-\u2013]\s*(R\d) link brought down", text)):
            return f"{m.group(1)}-{m.group(2)}"
    return None


def _threshold_from_script(settings: Settings) -> int | None:
    tr = SourceTracker(settings.scripts_dir, "src/scripts")
    text = tr.text("40_m2_failover.sh", required=False)
    if text and (m := re.search(r'"\$failures"\s*-ge\s*(\d+)', text)):
        return int(m.group(1))
    return None


def build(settings: Settings) -> FailoverResponse:
    tr = SourceTracker(settings.data_dir)
    log_rel = next((n for n in settings.m2_log_candidates if tr.exists(f"m2/{n}")), None)
    text = tr.text(f"m2/{log_rel}") if log_rel else None
    if log_rel is None:
        tr.missing.append(tr.display(f"m2/{settings.m2_log_candidates[0]}"))
        tr.warnings.append("No M2 controller log found.")
    runs = parse_runs(text) if text else []
    if text is not None and not runs:
        tr.warnings.append("The M2 log contains no controller runs ('M2 Failover Monitor Started' not found).")

    recovered = [r for r in runs if _outcome(r) == "recovered" and _metrics(r) and _metrics(r).first_fail_to_recovery_s is not None]  # type: ignore[union-attr]
    headline = recovered[-1] if recovered else None

    out_runs = []
    for r in runs:
        out_runs.append(FailoverRun(
            run_id=r.run_id, started=short_ts(r.started), completed=short_ts(r.completed),
            outcome=_outcome(r), is_headline=r is headline,  # type: ignore[arg-type]
            probe_failures=r.probe_failures, failover_attempts=r.attempts, error_count=r.errors,
            first_failed_probe=short_ts(r.first_failed), failover_triggered=short_ts(r.triggered),
            p2_installed=short_ts(r.installed), recovery_verified=short_ts(r.recovered),
            metrics=_metrics(r), verification=r.verification,
        ))

    head = None
    if headline:
        head = HeadlineTrial(
            run_id=headline.run_id, run_start=short_ts(headline.started),  # type: ignore[arg-type]
            detection_threshold=headline.threshold,
            probes_succeeded_before_failure=headline.ok_before_failure,
            metrics=_metrics(headline),  # type: ignore[arg-type]
            verification=headline.verification, events=headline.events,
        )

    # Describe honestly what the log holds.
    if head:
        others = [r for r in recovered if r is not headline]
        note = (
            f"The log holds {len(runs)} controller run(s); {len(recovered)} reached verified recovery. "
            f"Headline figures come from one run only (run {headline.run_id}, the most recent verified recovery). "
        )
        if others:
            o = others[-1]
            ov = o.verification
            note += (
                f"An earlier verified run (run {o.run_id}) is listed under `runs` but verified with "
                f"{ov.transmitted if ov else '?'} ping(s) vs {headline.verification.transmitted if headline.verification else '?'}; "
                "runs are not pooled and no averages are computed. "
            )
        note += "Treat the timings as one measured trial, not a performance guarantee."
        scope = "single_trial"
    else:
        note = "No run in the log reached verified recovery, so no recovery measurement is available."
        scope = "none"

    return FailoverResponse(
        data_source=tr.info("historical", "M2 controller log recorded during the failover experiment; not live telemetry."),
        generated_at=utc_now(), warnings=tr.warnings,
        measurement_scope=scope, scope_note=note,  # type: ignore[arg-type]
        source_log=tr.display(f"m2/{log_rel}") if log_rel else None,
        runs_in_log=len(runs), recovered_runs=len(recovered),
        detection_threshold=(headline.threshold if headline else None) or _threshold_from_script(settings),
        failure_link=_failure_link(tr), headline_trial=head, runs=out_runs,
        summary_file_check=_summary_check(tr, headline),
        limitations=[
            "Timings are measured from controller log timestamps; the first failed probe is not the exact physical link-down time.",
            "The controller switches to P2 once and never fails back.",
            "Detection time = first failed probe to failover trigger (three consecutive failed 1 s-timeout probes, ~1 s apart plus ping timeout).",
        ],
    )
