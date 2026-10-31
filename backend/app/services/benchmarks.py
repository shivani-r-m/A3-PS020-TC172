"""Benchmark results: recomputed from the per-trial CSVs and cross-checked against the
repository's own comparison_summary file. Nothing is estimated or filled in."""
from __future__ import annotations

import re
import statistics
from typing import Literal

from ..config import Settings
from ..schemas import (
    BenchmarkMode,
    BenchmarkRun,
    BenchmarksResponse,
    Comparison,
    SummaryCheck,
    TrialRow,
)
from .data_reader import SourceTracker, num, utc_now

_FINAL = "final"
_PATTERN = re.compile(r"^(m0|p1|p2)_benchmark_(\d{8})\.csv$")
_MODES: list[tuple[str, str, str]] = [
    ("M0", "M0_OSPFv3", "M0 · OSPFv3 baseline"),
    ("P1", "P1_SRv6", "M1 · SRv6 primary path (P1)"),
    ("P2", "P2_SRv6", "M1 · SRv6 backup path (P2)"),
]


def _date(run_id: str) -> str | None:
    return f"{run_id[:4]}-{run_id[4:6]}-{run_id[6:8]}" if len(run_id) == 8 and run_id.isdigit() else None


def parse_trials(rows: list[dict[str, str]]) -> tuple[list[TrialRow], int]:
    out: list[TrialRow] = []
    bad = 0
    for r in rows:
        tx, rx, dur = num(r.get("transmitted")), num(r.get("received")), num(r.get("duration_ms"))
        avg, mx = num(r.get("avg_ms")), num(r.get("max_ms"))
        trial = num(r.get("trial"))
        if None in (tx, rx, dur, avg, mx, trial) or tx <= 0 or rx < 0 or rx > tx:  # type: ignore[operator]
            bad += 1
            continue
        out.append(
            TrialRow(
                trial=int(trial),  # type: ignore[arg-type]
                transmitted=int(tx),  # type: ignore[arg-type]
                received=int(rx),  # type: ignore[arg-type]
                packet_loss_percent=round((tx - rx) / tx * 100, 6),  # type: ignore[operator]
                duration_ms=dur,  # type: ignore[arg-type]
                min_rtt_ms=num(r.get("min_ms")),
                avg_rtt_ms=avg,  # type: ignore[arg-type]
                max_rtt_ms=mx,  # type: ignore[arg-type]
                mdev_rtt_ms=num(r.get("mdev_ms")),
            )
        )
    return out, bad


def aggregate(mode_id: Literal["M0", "P1", "P2"], mode: str, label: str, source_file: str,
              trials: list[TrialRow], skipped: int, requested: set[int], include_trials: bool) -> BenchmarkMode:
    tx = sum(t.transmitted for t in trials)
    rx = sum(t.received for t in trials)
    total_ms = sum(t.duration_ms for t in trials)
    mins = [t.min_rtt_ms for t in trials if t.min_rtt_ms is not None]
    return BenchmarkMode(
        id=mode_id, mode=mode, label=label, source_file=source_file,
        trials=len(trials), skipped_rows=skipped,
        requested_pps=next(iter(requested)) if len(requested) == 1 else None,
        transmitted=tx, received=rx, packets_lost=tx - rx,
        packet_loss_percent=round((tx - rx) / tx * 100, 6),
        mean_trial_avg_rtt_ms=statistics.fmean(t.avg_rtt_ms for t in trials),
        median_trial_avg_rtt_ms=statistics.median(t.avg_rtt_ms for t in trials),
        min_rtt_ms=min(mins) if mins else None,
        max_rtt_ms=max(t.max_rtt_ms for t in trials),
        mean_trial_duration_ms=total_ms / len(trials),
        total_duration_ms=total_ms,
        observed_rate_pps=(tx / (total_ms / 1000)) if total_ms > 0 else None,
        trial_rows=trials if include_trials else None,
    )


def _check_summary(tr: SourceTracker, run_id: str, modes: list[BenchmarkMode]) -> SummaryCheck | None:
    rel = f"{_FINAL}/comparison_summary_{run_id}.csv"
    got = tr.csv_rows(rel, required=False)
    if got is None:
        return None
    by_mode = {r.get("mode", ""): r for r in got[0]}
    problems: list[str] = []
    for m in modes:
        r = by_mode.get(m.mode)
        if r is None:
            problems.append(f"{m.mode}: not present in {rel}")
            continue
        pairs = [
            ("trials", m.trials, 0), ("transmitted", m.transmitted, 0), ("received", m.received, 0),
            ("packet_loss_percent", m.packet_loss_percent, 1e-6),
            ("mean_trial_avg_rtt_ms", m.mean_trial_avg_rtt_ms, 5e-6),
            ("median_trial_avg_rtt_ms", m.median_trial_avg_rtt_ms, 5e-6),
            ("mean_trial_duration_ms", m.mean_trial_duration_ms, 0.05),
            ("highest_observed_rtt_ms", m.max_rtt_ms, 1e-9),
        ]
        for key, mine, tol in pairs:
            theirs = num(r.get(key))
            if theirs is None or abs(theirs - mine) > tol:
                problems.append(f"{m.mode}.{key}: file={r.get(key)!r} recomputed={mine:.6g}")
    return SummaryCheck(file=tr.display(rel), matches=not problems, mismatches=problems)


def load_latest_run(tr: SourceTracker, include_trials: bool) -> BenchmarkRun | None:
    found: dict[str, dict[str, str]] = {}  # run_id -> {m0|p1|p2: filename}
    for name in tr.list_dir(_FINAL):
        m = _PATTERN.match(name)
        if m:
            found.setdefault(m.group(2), {})[m.group(1)] = name
    if not found:
        tr.warnings.append(f"No benchmark files matching <mode>_benchmark_YYYYMMDD.csv in {tr.display(_FINAL)}.")
        return None
    run_id = max(found)
    modes: list[BenchmarkMode] = []
    for mode_id, mode, label in _MODES:
        name = found[run_id].get(mode_id.lower())
        if not name:
            tr.warnings.append(f"Run {run_id}: no per-trial file for {mode_id}; not reported.")
            continue
        got = tr.csv_rows(f"{_FINAL}/{name}")
        if got is None:
            continue
        rows, _ = got
        trials, skipped = parse_trials(rows)
        if skipped:
            tr.warnings.append(f"{name}: {skipped} row(s) had missing or invalid values and were excluded.")
        if not trials:
            tr.warnings.append(f"{name}: no valid trial rows; {mode_id} not reported.")
            continue
        requested = {int(v) for r in rows if (v := num(r.get("requested_pps"))) is not None}
        modes.append(aggregate(mode_id, mode, label, tr.display(f"{_FINAL}/{name}"), trials, skipped, requested, include_trials))  # type: ignore[arg-type]
    if not modes:
        return None
    return BenchmarkRun(run_id=run_id, run_date=_date(run_id), modes=modes, summary_file_check=_check_summary(tr, run_id, modes))


def _load_earlier(tr: SourceTracker) -> BenchmarkRun | None:
    """Earlier P1/P2-only benchmark (src/results/benchmark). Different run, kept separate."""
    modes: list[BenchmarkMode] = []
    for mode_id, mode, label in _MODES[1:]:
        rel = f"benchmark/{mode_id.lower()}_benchmark.csv"
        got = tr.csv_rows(rel, required=False)
        if got is None:
            continue
        trials, skipped = parse_trials(got[0])
        if trials:
            requested = {int(v) for r in got[0] if (v := num(r.get("requested_pps"))) is not None}
            modes.append(aggregate(mode_id, mode, label, tr.display(rel), trials, skipped, requested, False))  # type: ignore[arg-type]
    return BenchmarkRun(run_id="earlier", run_date=None, modes=modes) if modes else None


def build(settings: Settings, include_trials: bool = False) -> BenchmarksResponse:
    tr = SourceTracker(settings.data_dir)
    latest = load_latest_run(tr, include_trials)
    earlier = _load_earlier(tr)

    comparison: list[Comparison] = []
    if latest:
        m0 = next((m for m in latest.modes if m.id == "M0"), None)
        for m in latest.modes:
            if m.id == "M0":
                continue
            comparison.append(Comparison(
                mode=m.mode,
                mean_rtt_delta_vs_m0_ms=round(m.mean_trial_avg_rtt_ms - m0.mean_trial_avg_rtt_ms, 6) if m0 else None,
                max_rtt_delta_vs_m0_ms=round(m.max_rtt_ms - m0.max_rtt_ms, 6) if m0 else None,
                packet_loss_delta_vs_m0_pp=round(m.packet_loss_percent - m0.packet_loss_percent, 6) if m0 else None,
            ))
    return BenchmarksResponse(
        data_source=tr.info("historical", "Per-trial benchmark CSVs recorded in src/results; recomputed here, not measured live."),
        generated_at=utc_now(),
        warnings=tr.warnings,
        latest=latest,
        comparison_vs_m0=comparison,
        earlier_run=earlier,
        notes=[
            "Median RTT is the median of per-trial average RTTs; per-packet RTTs are not stored in the result files.",
            "Maximum RTT is the highest per-trial maximum, i.e. the worst single packet in the run; outliers are retained.",
            "`earlier_run` is a previous P1/P2 run (no M0) and is kept only for reference; it differs from `latest` and is not mixed into it.",
        ],
    )
