import { parseCsv } from '../lib/csv';
import type { BenchmarkMode, BenchmarkSummaryRow, FailoverTrial } from '../types';

const DATA_BASE = `${import.meta.env.BASE_URL}data`;

async function fetchText(path: string): Promise<string> {
  const res = await fetch(`${DATA_BASE}/${path}`);
  if (!res.ok) {
    throw new Error(`Could not load ${path} (HTTP ${res.status}). Run "npm run sync:data".`);
  }
  return res.text();
}

const MODES: BenchmarkMode[] = ['M0_OSPFv3', 'P1_SRv6', 'P2_SRv6'];

/** Source of truth: src/results/final/comparison_summary_20261031.csv */
export async function loadBenchmarkSummary(): Promise<BenchmarkSummaryRow[]> {
  const rows = parseCsv(await fetchText('final/comparison_summary_20261031.csv'));
  const parsed = rows.map((r) => ({
    mode: r.mode as BenchmarkMode,
    trials: Number(r.trials),
    transmitted: Number(r.transmitted),
    received: Number(r.received),
    packetLossPercent: Number(r.packet_loss_percent),
    meanTrialAvgRttMs: Number(r.mean_trial_avg_rtt_ms),
    medianTrialAvgRttMs: Number(r.median_trial_avg_rtt_ms),
    meanTrialDurationMs: Number(r.mean_trial_duration_ms),
    highestObservedRttMs: Number(r.highest_observed_rtt_ms),
  }));
  const known = parsed.filter((r) => MODES.includes(r.mode));
  if (known.length === 0) {
    throw new Error('comparison_summary_20261031.csv contained no recognised modes.');
  }
  return known.sort((a, b) => MODES.indexOf(a.mode) - MODES.indexOf(b.mode));
}

/** Source of truth: src/results/m2/failover_success_20261030.log (parsed by scripts/sync-data.mjs) */
export async function loadFailoverTrial(): Promise<FailoverTrial> {
  const text = await fetchText('m2/trial.json');
  return JSON.parse(text) as FailoverTrial;
}
