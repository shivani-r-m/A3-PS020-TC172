import type { LogEntry } from '../types';

/**
 * Activity recorded in the repository's result files. Timestamps are shown exactly as
 * written in those files (VM clock; the M0 validation file states UTC, others do not).
 * Every entry names the file it came from.
 */
export const RECORDED_ACTIVITY: LogEntry[] = [
  {
    id: 'bench-final',
    timestamp: '2026-10-31',
    category: 'Benchmark',
    description: 'Final benchmark: M0, P1 and P2 — 30 trials × 1,000 packets each, 0% loss in all modes',
    status: 'ok',
    sourceFile: 'src/results/final/comparison_summary_20261031.csv',
  },
  {
    id: 'm1-validation-final',
    timestamp: '2026-10-31',
    category: 'M1',
    description: 'Path validation: P1 and P2 each 10/10 received (avg RTT 0.142 ms and 0.239 ms)',
    status: 'ok',
    sourceFile: 'src/results/final/path_validation_20261031.txt',
  },
  {
    id: 'm0-validation',
    timestamp: '2026-10-30 23:34:28 UTC',
    category: 'M0',
    description: 'OSPFv3 route check on R1 and connectivity test: 10/10 received, avg RTT 0.108 ms',
    status: 'ok',
    sourceFile: 'src/results/final/m0_validation_20261031.txt',
  },
  {
    id: 'm2-recovery',
    timestamp: '2026-10-30 23:10:26',
    category: 'M2',
    description: 'Failover trial: backup path P2 installed and recovery verified (5/5 pings, 0% loss)',
    status: 'ok',
    sourceFile: 'src/results/m2/failover_success_20261030.log',
  },
  {
    id: 'm0-failure-test',
    timestamp: '2026-10-30 17:49:58',
    category: 'M0',
    description: 'R2–R5 link failure test: OSPFv3 rerouted via R3 → R4; 400/400 packets received (smoke test, 20 pps)',
    status: 'ok',
    sourceFile: 'src/results/m0_summary.txt',
  },
];
