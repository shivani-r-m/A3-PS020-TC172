import type { ApiBenchmarks, ApiFailover, ApiLogs } from '../types/api';
import type { BenchmarkSummaryRow, FailoverEventKind, FailoverTrial, LogEntry } from '../types';

/** Backend responses -> the shapes the existing Stage 1 components already render. */

export function toBenchmarkRows(api: ApiBenchmarks): BenchmarkSummaryRow[] {
  const rows = (api.latest?.modes ?? []).map((m) => ({
    mode: m.mode as BenchmarkSummaryRow['mode'],
    trials: m.trials,
    transmitted: m.transmitted,
    received: m.received,
    packetLossPercent: m.packet_loss_percent,
    meanTrialAvgRttMs: m.mean_trial_avg_rtt_ms,
    medianTrialAvgRttMs: m.median_trial_avg_rtt_ms,
    meanTrialDurationMs: m.mean_trial_duration_ms,
    highestObservedRttMs: m.max_rtt_ms,
  }));
  if (rows.length === 0) throw new Error('The backend returned no benchmark data (see its warnings).');
  return rows;
}

export function toFailoverTrial(api: ApiFailover): FailoverTrial {
  const t = api.headline_trial;
  const m = t?.metrics;
  if (!t || !m || m.first_fail_to_install_s == null || m.first_fail_to_recovery_s == null || m.install_to_recovery_s == null) {
    throw new Error('The backend found no verified failover recovery in the recorded log.');
  }
  const ev = (k: string) => t.events.find((e) => e.kind === k)?.timestamp ?? '';
  const v = t.verification;
  return {
    sourceFile: api.source_log ?? '',
    runStart: t.run_start,
    detectionThreshold: t.detection_threshold ?? 3,
    probesSucceededBeforeFailure: t.probes_succeeded_before_failure,
    events: t.events.map((e) => ({ timestamp: e.timestamp, kind: e.kind as FailoverEventKind, message: e.message })),
    metrics: {
      firstFailedProbe: ev('probe_failed'),
      p2Installed: ev('p2_installed'),
      recoveryVerified: ev('recovery_verified'),
      firstFailToInstallS: m.first_fail_to_install_s,
      firstFailToRecoveryS: m.first_fail_to_recovery_s,
      installToRecoveryS: m.install_to_recovery_s,
    },
    verification:
      v && v.rtt_min_ms != null && v.rtt_avg_ms != null && v.rtt_max_ms != null && v.rtt_mdev_ms != null
        ? {
            transmitted: v.transmitted,
            received: v.received,
            lossPercent: v.packet_loss_percent,
            rttMinMs: v.rtt_min_ms,
            rttAvgMs: v.rtt_avg_ms,
            rttMaxMs: v.rtt_max_ms,
            rttMdevMs: v.rtt_mdev_ms,
          }
        : null,
  };
}

export function toLogEntries(api: ApiLogs): LogEntry[] {
  return api.entries.map((e) => ({
    id: e.id,
    timestamp: e.timestamp ?? 'no timestamp recorded',
    category: e.category,
    description: e.message,
    status: e.severity,
    sourceFile: e.source_file,
  }));
}
