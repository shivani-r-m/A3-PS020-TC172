// Copies the recorded experiment results from ../src/results into public/data
// and derives a structured M2 failover trial from the controller log.
//
// This script only READS from src/. It never modifies the SRv6 implementation.
// Nothing is invented: every number written here is parsed from a repo file.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, '..');
const results = resolve(frontendRoot, '..', 'src', 'results');
const out = join(frontendRoot, 'public', 'data');

const FINAL_FILES = [
  'comparison_summary_20261031.csv',
  'm0_benchmark_20261031.csv',
  'p1_benchmark_20261031.csv',
  'p2_benchmark_20261031.csv',
];
const M2_LOG = 'failover_success_20261030.log';

function ensure(dir) {
  mkdirSync(dir, { recursive: true });
}

if (!existsSync(results)) {
  if (existsSync(join(out, 'final'))) {
    console.warn(`[sync-data] ${results} not found; keeping existing public/data.`);
    process.exit(0);
  }
  console.error(`[sync-data] ${results} not found and no cached data exists.`);
  console.error('            Keep frontend/ next to src/ inside the repository.');
  process.exit(1);
}

// ---- 1. Benchmark CSVs (copied byte-for-byte) -------------------------------
ensure(join(out, 'final'));
for (const f of FINAL_FILES) {
  const src = join(results, 'final', f);
  if (!existsSync(src)) {
    console.warn(`[sync-data] missing ${src}`);
    continue;
  }
  copyFileSync(src, join(out, 'final', f));
}

// ---- 2. M2 failover trial ---------------------------------------------------
const TS = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d+)/;

function toEpochMs(ts) {
  const m = TS.exec(ts);
  if (!m) return NaN;
  const whole = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return whole + Number('0.' + m[7]) * 1000;
}
const short = (ts) => ts.slice(0, 23); // keep millisecond precision for display
const seconds = (a, b) => Math.round(toEpochMs(b) - toEpochMs(a)) / 1000;

const logPath = join(results, 'm2', M2_LOG);
if (existsSync(logPath)) {
  const lines = readFileSync(logPath, 'utf8').split(/\r?\n/);

  // Split into controller runs and keep the last one that verified recovery.
  const starts = [];
  lines.forEach((l, i) => {
    if (l.includes('M2 Failover Monitor Started:')) starts.push(i);
  });
  starts.push(lines.length);

  let chosen = null;
  for (let r = 0; r < starts.length - 1; r++) {
    const slice = lines.slice(starts[r], starts[r + 1]);
    if (slice.some((l) => l.includes('RECOVERY SUCCESS'))) chosen = slice;
  }

  if (chosen) {
    const events = [];
    let okBefore = 0;
    let seenFailure = false;
    let first = null;
    let installed = null;
    let recovered = null;
    let runStart = null;
    let verification = null;

    for (let i = 0; i < chosen.length; i++) {
      const l = chosen[i];
      const startM = /Monitor Started: (\S+ \S+)/.exec(l);
      if (startM) {
        runStart = short(startM[1]);
        events.push({ timestamp: runStart, kind: 'run_started', message: 'M2 failover monitor started' });
        continue;
      }
      const doneM = /Monitor Completed: (\S+ \S+)/.exec(l);
      if (doneM) {
        events.push({ timestamp: short(doneM[1]), kind: 'run_completed', message: 'M2 failover monitor completed' });
        continue;
      }
      const m = /^(\d{4}-\d{2}-\d{2} \S+) (SUCCESS|FAILURE|FAILOVER|P2 INSTALLED|RECOVERY SUCCESS|RECOVERY FAILED|ERROR|TIMEOUT)(?::\s*(.*))?$/.exec(l);
      if (!m) {
        const stat = /(\d+) packets transmitted, (\d+) received, ([\d.]+)% packet loss/.exec(l);
        const rtt = /rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/.exec(l);
        if (stat) verification = { ...(verification ?? {}), transmitted: +stat[1], received: +stat[2], lossPercent: +stat[3] };
        if (rtt)
          verification = {
            ...(verification ?? {}),
            rttMinMs: +rtt[1],
            rttAvgMs: +rtt[2],
            rttMaxMs: +rtt[3],
            rttMdevMs: +rtt[4],
          };
        continue;
      }
      const [, ts, tag, rest] = m;
      if (tag === 'SUCCESS') {
        if (!seenFailure) okBefore++;
        continue;
      }
      const kinds = {
        FAILURE: 'probe_failed',
        FAILOVER: 'failover_started',
        'P2 INSTALLED': 'p2_installed',
        'RECOVERY SUCCESS': 'recovery_verified',
        'RECOVERY FAILED': 'recovery_failed',
        ERROR: 'error',
        TIMEOUT: 'timeout',
      };
      if (tag === 'FAILURE') {
        seenFailure = true;
        if (!first) first = ts;
      }
      if (tag === 'P2 INSTALLED') installed = ts;
      if (tag === 'RECOVERY SUCCESS') recovered = ts;
      events.push({
        timestamp: short(ts),
        kind: kinds[tag],
        message: rest && rest.length ? rest : tag.toLowerCase().replace(/^./, (c) => c.toUpperCase()),
      });
    }

    if (first && installed && recovered) {
      const trial = {
        sourceFile: `src/results/m2/${M2_LOG}`,
        runStart,
        detectionThreshold: 3,
        probesSucceededBeforeFailure: okBefore,
        events,
        metrics: {
          firstFailedProbe: short(first),
          p2Installed: short(installed),
          recoveryVerified: short(recovered),
          firstFailToInstallS: seconds(first, installed),
          firstFailToRecoveryS: seconds(first, recovered),
          installToRecoveryS: seconds(installed, recovered),
        },
        verification,
      };
      ensure(join(out, 'm2'));
      writeFileSync(join(out, 'm2', 'trial.json'), JSON.stringify(trial, null, 2));
      console.log(
        `[sync-data] M2 trial: ${trial.metrics.firstFailToInstallS}s / ${trial.metrics.firstFailToRecoveryS}s / ${trial.metrics.installToRecoveryS}s`,
      );
    } else {
      console.warn('[sync-data] M2 run found but timestamps incomplete; trial.json not written.');
    }
  } else {
    console.warn('[sync-data] no M2 run with RECOVERY SUCCESS found.');
  }
} else {
  console.warn(`[sync-data] missing ${logPath}`);
}

console.log('[sync-data] done.');
