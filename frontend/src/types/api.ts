// Response shapes of the read-only FastAPI backend (backend/app/schemas.py).
// Only GET endpoints exist; every response states its data source.

export interface ApiDataSource {
  kind: 'historical' | 'repo_config' | 'unavailable';
  live_telemetry: boolean;
  description: string;
  files: string[];
  missing_files: string[];
  last_modified: string | null;
}

export interface ApiEnvelope {
  data_source: ApiDataSource;
  generated_at: string;
  warnings: string[];
}

export interface ApiHealth {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  read_only: boolean;
  live_telemetry: boolean;
  host_os: string;
  data_dir: { path: string; exists: boolean; readable: boolean; files_found: number };
  scripts_dir_exists: boolean;
}

export interface ApiBenchmarkMode {
  id: 'M0' | 'P1' | 'P2';
  mode: string;
  label: string;
  source_file: string;
  trials: number;
  skipped_rows: number;
  transmitted: number;
  received: number;
  packets_lost: number;
  packet_loss_percent: number;
  mean_trial_avg_rtt_ms: number;
  median_trial_avg_rtt_ms: number;
  max_rtt_ms: number;
  mean_trial_duration_ms: number;
  total_duration_ms: number;
  observed_rate_pps: number | null;
}

export interface ApiBenchmarkRun {
  run_id: string;
  run_date: string | null;
  modes: ApiBenchmarkMode[];
  summary_file_check: { file: string; matches: boolean; mismatches: string[] } | null;
}

export interface ApiBenchmarks extends ApiEnvelope {
  latest: ApiBenchmarkRun | null;
  earlier_run: ApiBenchmarkRun | null;
  notes: string[];
}

export interface ApiFailoverMetrics {
  detection_time_s: number | null;
  path_installation_time_s: number | null;
  first_fail_to_install_s: number | null;
  first_fail_to_recovery_s: number | null;
  install_to_recovery_s: number | null;
}

export interface ApiFailoverEvent {
  timestamp: string;
  kind: string;
  message: string;
}

export interface ApiFailover extends ApiEnvelope {
  measurement_scope: 'single_trial' | 'none';
  scope_note: string;
  source_log: string | null;
  runs_in_log: number;
  recovered_runs: number;
  detection_threshold: number | null;
  headline_trial: {
    run_id: number;
    run_start: string;
    detection_threshold: number | null;
    probes_succeeded_before_failure: number;
    metrics: ApiFailoverMetrics;
    verification: {
      transmitted: number;
      received: number;
      packet_loss_percent: number;
      rtt_min_ms: number | null;
      rtt_avg_ms: number | null;
      rtt_max_ms: number | null;
      rtt_mdev_ms: number | null;
    } | null;
    events: ApiFailoverEvent[];
  } | null;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string | null;
  category: 'M0' | 'M1' | 'M2' | 'Benchmark';
  kind: 'event' | 'record';
  severity: 'info' | 'ok' | 'warn' | 'error';
  message: string;
  source_file: string;
}

export interface ApiLogs extends ApiEnvelope {
  total_available: number;
  returned: number;
  entries: ApiLogEntry[];
}

export interface ApiTopology extends ApiEnvelope {
  nodes: { id: string; namespace: string; kind: 'endpoint' | 'router' }[];
  links: { id: string; a: string; b: string; subnet: string | null; failure_link: boolean; status: 'unknown' }[];
  paths: { id: 'P1' | 'P2'; role: string; nodes: string[]; segments: string[]; link_ids: string[] }[];
  failure_link: string | null;
  live_status_note: string;
}

export interface ApiOverview extends ApiEnvelope {
  last_updated: string | null;
  experiment_dates: Record<string, string | null>;
  m2_measurement_scope: string;
}
