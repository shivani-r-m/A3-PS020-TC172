/**
 * Where a displayed value came from. Every metric in the UI carries one of these
 * so configured / recorded / live / mock data are never confused.
 *
 *  live        – returned by the backend API right now (connection health only)
 *  recorded    – recorded experiment results (served by the backend, or the bundled copy
 *                when the backend is unavailable and the demo fallback is shown)
 *  config      – taken from the repository's scripts (topology, SIDs)
 *  mock        – demo fallback / placeholder: NOT fetched from the backend
 *  unavailable – no data
 */
export type DataSource = 'live' | 'recorded' | 'config' | 'mock' | 'unavailable';

// ---------------------------------------------------------------------------
// Recorded data (parsed from src/results)
// ---------------------------------------------------------------------------

export type BenchmarkMode = 'M0_OSPFv3' | 'P1_SRv6' | 'P2_SRv6';

export interface BenchmarkSummaryRow {
  mode: BenchmarkMode;
  trials: number;
  transmitted: number;
  received: number;
  packetLossPercent: number;
  meanTrialAvgRttMs: number;
  medianTrialAvgRttMs: number;
  meanTrialDurationMs: number;
  highestObservedRttMs: number;
}

export type FailoverEventKind =
  | 'run_started'
  | 'probe_failed'
  | 'failover_started'
  | 'p2_installed'
  | 'recovery_verified'
  | 'recovery_failed'
  | 'error'
  | 'timeout'
  | 'run_completed';

export interface FailoverEvent {
  timestamp: string;
  kind: FailoverEventKind;
  message: string;
}

export interface FailoverTrial {
  sourceFile: string;
  runStart: string | null;
  detectionThreshold: number;
  probesSucceededBeforeFailure: number;
  events: FailoverEvent[];
  metrics: {
    firstFailedProbe: string;
    p2Installed: string;
    recoveryVerified: string;
    firstFailToInstallS: number;
    firstFailToRecoveryS: number;
    installToRecoveryS: number;
  };
  verification: {
    transmitted: number;
    received: number;
    lossPercent: number;
    rttMinMs: number;
    rttAvgMs: number;
    rttMaxMs: number;
    rttMdevMs: number;
  } | null;
}

export type HealthState = 'healthy' | 'degraded' | 'down' | 'unknown';
export type LinkState = 'up' | 'down' | 'unknown';

export type LogCategory = 'M0' | 'M1' | 'M2' | 'Benchmark';
export type LogStatus = 'ok' | 'warn' | 'error' | 'info';

export interface LogEntry {
  id: string;
  timestamp: string;
  category: LogCategory;
  description: string;
  status: LogStatus;
  sourceFile?: string;
}
