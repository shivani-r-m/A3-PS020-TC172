"""Overview: composes the other services; a failure in one never hides the rest."""
from __future__ import annotations

import re

from ..config import Settings
from ..schemas import ModeOverview, OverviewResponse
from . import benchmarks as benchmarks_service
from . import failover as failover_service
from .data_reader import SourceTracker, utc_now

PROJECT = {
    "name": "AIORI-3 SRv6",
    "code": "A3-PS020-TC172",
    "team": "NetNova",
    "title": "Local SRv6 Path Steering and Measured Failure Recovery",
}


def _iso_from_log(ts: str | None) -> str | None:
    return ts[:10] if ts else None


def build(settings: Settings) -> OverviewResponse:
    bm = benchmarks_service.build(settings)
    fo = failover_service.build(settings)
    warnings = list(dict.fromkeys([*bm.warnings, *fo.warnings]))

    latest = bm.latest
    row = {m.id: m for m in latest.modes} if latest else {}
    head = fo.headline_trial

    def meas(m) -> str | None:
        if not m:
            return None
        return (f"{m.transmitted:,} packets, {m.packet_loss_percent:g}% loss, mean trial RTT {m.mean_trial_avg_rtt_ms:.5g} ms, "
                f"max {m.max_rtt_ms:g} ms ({m.trials} trials)")

    modes = [
        ModeOverview(id="M0", name="OSPFv3 baseline",
                     configured="FRRouting ospf6d computes the route; no SRv6 policy is installed.",
                     measured=meas(row.get("M0")), source_files=[m.source_file for m in [row.get("M0")] if m]),
        ModeOverview(id="M1-P1", name="SRv6 primary path (P1)",
                     configured="Encapsulation at R1 with segments via R2 (End) then R5 (End.DT6).",
                     measured=meas(row.get("P1")), source_files=[m.source_file for m in [row.get("P1")] if m]),
        ModeOverview(id="M1-P2", name="SRv6 backup path (P2)",
                     configured="Encapsulation at R1 with segments via R3, R4 (End) then R5 (End.DT6).",
                     measured=meas(row.get("P2")), source_files=[m.source_file for m in [row.get("P2")] if m]),
        ModeOverview(
            id="M2", name="Failure recovery",
            configured=f"Controller installs P2 after {fo.detection_threshold or '?'} consecutive failed probes; one-way switch, no failback.",
            measured=(f"Single trial: recovery verified {head.metrics.first_fail_to_recovery_s:g} s after the first failed probe "
                      f"(P2 installed after {head.metrics.first_fail_to_install_s:g} s)." if head and head.metrics.first_fail_to_recovery_s is not None else None),
            source_files=[fo.source_log] if fo.source_log and head else [],
        ),
    ]

    mtimes = [d.data_source.last_modified for d in (bm, fo) if d.data_source.last_modified]
    kinds = {bm.data_source.kind, fo.data_source.kind}
    kind = "historical" if "historical" in kinds else "unavailable"
    files = list(dict.fromkeys([*bm.data_source.files, *fo.data_source.files]))
    missing = list(dict.fromkeys([*bm.data_source.missing_files, *fo.data_source.missing_files]))
    ds = bm.data_source.model_copy(update={
        "kind": kind, "files": files, "missing_files": missing,
        "last_modified": max(mtimes) if mtimes else None,
        "description": "Historical recorded results (benchmark CSVs and the M2 controller log). Not live telemetry.",
    })
    return OverviewResponse(
        data_source=ds, generated_at=utc_now(), warnings=warnings, project=PROJECT, modes=modes,
        latest_benchmark=latest, m2_headline=head, m2_measurement_scope=fo.measurement_scope,
        last_updated=ds.last_modified,
        experiment_dates={
            "benchmark_run": latest.run_date if latest else None,
            "m2_headline_run": _iso_from_log(head.run_start) if head else None,
        },
    )
