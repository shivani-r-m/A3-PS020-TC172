"""Pydantic response models. Every response carries ``data_source`` so the UI can tell
historical recorded results apart from live telemetry (which this stage does not provide)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

SourceKind = Literal["historical", "repo_config", "unavailable"]


class DataSourceInfo(BaseModel):
    kind: SourceKind
    live_telemetry: bool = False
    description: str
    files: list[str] = Field(default_factory=list, description="Files actually read, relative to the repo's src/ directory")
    missing_files: list[str] = Field(default_factory=list)
    last_modified: str | None = Field(None, description="Newest file modification time (UTC). In a fresh git checkout this is the checkout time, not the experiment time.")


class Envelope(BaseModel):
    data_source: DataSourceInfo
    generated_at: str
    warnings: list[str] = Field(default_factory=list)


# ---- health -----------------------------------------------------------------
class DataDirStatus(BaseModel):
    path: str
    exists: bool
    readable: bool
    files_found: int


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str
    version: str
    timestamp: str
    read_only: bool = True
    live_telemetry: bool = False
    host_os: str
    data_dir: DataDirStatus
    scripts_dir_exists: bool


# ---- benchmarks -------------------------------------------------------------
class TrialRow(BaseModel):
    trial: int
    transmitted: int
    received: int
    packet_loss_percent: float
    duration_ms: float
    min_rtt_ms: float | None = None
    avg_rtt_ms: float
    max_rtt_ms: float
    mdev_rtt_ms: float | None = None


class BenchmarkMode(BaseModel):
    id: Literal["M0", "P1", "P2"]
    mode: str = Field(description="Label used in the result CSV, e.g. M0_OSPFv3")
    label: str
    source_file: str
    trials: int
    skipped_rows: int = 0
    requested_pps: int | None = None
    transmitted: int
    received: int
    packets_lost: int
    packet_loss_percent: float
    mean_trial_avg_rtt_ms: float
    median_trial_avg_rtt_ms: float
    min_rtt_ms: float | None = None
    max_rtt_ms: float = Field(description="Highest single-packet RTT seen in any trial (max of per-trial max)")
    mean_trial_duration_ms: float
    total_duration_ms: float
    observed_rate_pps: float | None = None
    trial_rows: list[TrialRow] | None = None


class SummaryCheck(BaseModel):
    file: str
    matches: bool
    mismatches: list[str] = Field(default_factory=list)


class Comparison(BaseModel):
    mode: str
    mean_rtt_delta_vs_m0_ms: float | None
    max_rtt_delta_vs_m0_ms: float | None
    packet_loss_delta_vs_m0_pp: float | None


class BenchmarkRun(BaseModel):
    run_id: str = Field(description="Date stamp from the file names, e.g. 20261031")
    run_date: str | None
    modes: list[BenchmarkMode]
    summary_file_check: SummaryCheck | None = None


class BenchmarksResponse(Envelope):
    latest: BenchmarkRun | None
    comparison_vs_m0: list[Comparison] = Field(default_factory=list)
    earlier_run: BenchmarkRun | None = Field(None, description="Earlier P1/P2-only benchmark kept in src/results/benchmark; superseded by `latest`")
    notes: list[str] = Field(default_factory=list)


# ---- failover ---------------------------------------------------------------
class PingVerification(BaseModel):
    transmitted: int
    received: int
    packet_loss_percent: float
    rtt_min_ms: float | None = None
    rtt_avg_ms: float | None = None
    rtt_max_ms: float | None = None
    rtt_mdev_ms: float | None = None


class FailoverMetrics(BaseModel):
    detection_time_s: float | None = Field(None, description="First failed probe -> failover triggered (3rd consecutive failed probe)")
    path_installation_time_s: float | None = Field(None, description="Failover triggered -> P2 installed")
    first_fail_to_install_s: float | None
    first_fail_to_recovery_s: float | None
    install_to_recovery_s: float | None


class FailoverEvent(BaseModel):
    timestamp: str
    kind: str
    message: str


class FailoverRun(BaseModel):
    run_id: int
    started: str
    completed: str | None = None
    outcome: Literal["recovered", "timeout", "install_failed", "installed_unverified", "no_failover", "incomplete"]
    is_headline: bool = False
    probe_failures: int
    failover_attempts: int
    error_count: int
    first_failed_probe: str | None = None
    failover_triggered: str | None = None
    p2_installed: str | None = None
    recovery_verified: str | None = None
    metrics: FailoverMetrics | None = None
    verification: PingVerification | None = None


class HeadlineTrial(BaseModel):
    run_id: int
    run_start: str
    detection_threshold: int | None
    probes_succeeded_before_failure: int
    metrics: FailoverMetrics
    verification: PingVerification | None
    events: list[FailoverEvent]


class FailoverSummaryCheck(BaseModel):
    file: str
    matches: bool
    expected: dict[str, float]
    computed: dict[str, float]


class FailoverResponse(Envelope):
    measurement_scope: Literal["single_trial", "none"]
    scope_note: str
    source_log: str | None
    runs_in_log: int
    recovered_runs: int
    detection_threshold: int | None
    failure_link: str | None
    headline_trial: HeadlineTrial | None
    runs: list[FailoverRun]
    summary_file_check: FailoverSummaryCheck | None = None
    limitations: list[str]


# ---- logs -------------------------------------------------------------------
class LogEntry(BaseModel):
    id: str
    timestamp: str | None = Field(None, description="As written in the source file (VM clock; time zone is not recorded except where stated)")
    category: Literal["M0", "M1", "M2", "Benchmark"]
    kind: Literal["event", "record"]
    severity: Literal["info", "ok", "warn", "error"]
    message: str
    source_file: str


class LogsResponse(Envelope):
    total_available: int
    returned: int
    entries: list[LogEntry]
    notes: list[str] = Field(default_factory=list)


# ---- topology ---------------------------------------------------------------
class Interface(BaseModel):
    name: str
    address: str


class TopologyNode(BaseModel):
    id: str
    namespace: str
    kind: Literal["endpoint", "router"]
    interfaces: list[Interface]
    sid: str | None = None
    sid_behavior: str | None = None
    status: Literal["unknown"] = "unknown"


class TopologyLink(BaseModel):
    id: str
    a: str
    b: str
    subnet: str | None
    failure_link: bool = False
    status: Literal["unknown"] = "unknown"


class TopologyPath(BaseModel):
    id: Literal["P1", "P2"]
    role: Literal["primary", "backup"]
    nodes: list[str]
    segments: list[str]
    link_ids: list[str]


class TopologyResponse(Envelope):
    nodes: list[TopologyNode]
    links: list[TopologyLink]
    paths: list[TopologyPath]
    failure_link: str | None
    destination: str | None
    live_status_note: str


# ---- overview ---------------------------------------------------------------
class ModeOverview(BaseModel):
    id: Literal["M0", "M1-P1", "M1-P2", "M2"]
    name: str
    configured: str
    measured: str | None
    source_files: list[str]


class OverviewResponse(Envelope):
    project: dict[str, str]
    modes: list[ModeOverview]
    latest_benchmark: BenchmarkRun | None
    m2_headline: HeadlineTrial | None
    m2_measurement_scope: str
    last_updated: str | None
    experiment_dates: dict[str, str | None]
