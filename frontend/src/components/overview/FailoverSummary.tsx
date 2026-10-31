import { fmtRtt, fmtSeconds } from '../../lib/format';
import type { FailoverEvent, FailoverEventKind, FailoverTrial } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { toneDot } from '../ui/Tone';
import type { Tone } from '../ui/Tone';

const KIND_TONE: Record<FailoverEventKind, Tone> = {
  run_started: 'neutral',
  probe_failed: 'bad',
  failover_started: 'warn',
  p2_installed: 'violet',
  recovery_verified: 'ok',
  recovery_failed: 'bad',
  error: 'bad',
  timeout: 'bad',
  run_completed: 'neutral',
};

const HIDDEN: FailoverEventKind[] = ['run_started', 'run_completed'];

function timeOf(e: FailoverEvent): string {
  return e.timestamp.slice(11); // HH:MM:SS.mmm
}

export function FailoverSummary({ trial }: { trial: FailoverTrial }) {
  const { metrics, verification } = trial;
  const events = trial.events.filter((e) => !HIDDEN.includes(e.kind));

  const tiles = [
    { label: 'First failed probe → P2 installed', value: metrics.firstFailToInstallS },
    { label: 'First failed probe → recovery verified', value: metrics.firstFailToRecoveryS },
    { label: 'P2 installed → recovery verified', value: metrics.installToRecoveryS },
  ];

  return (
    <div>
      <div className="mb-3">
        <StatusBadge tone="warn">One measured trial — not a guaranteed recovery time</StatusBadge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-ink-600/60 bg-ink-800/40 p-2.5">
            <div className="text-lg font-semibold tracking-tight text-slate-100">
              {fmtSeconds(t.value)}
              <span className="ml-1 text-xs font-normal text-slate-500">s</span>
            </div>
            <div className="mt-1 text-[10px] leading-snug text-slate-500">{t.label}</div>
          </div>
        ))}
      </div>

      {verification && (
        <p className="mt-3 text-xs text-slate-400">
          Verification: <span className="text-slate-200">{verification.received}/{verification.transmitted}</span> pings
          received, {verification.lossPercent}% loss, average RTT{' '}
          <span className="mono text-slate-200">{fmtRtt(verification.rttAvgMs)} ms</span>.
        </p>
      )}

      <ol className="mt-3 space-y-1.5 border-l border-ink-600/70 pl-3">
        {events.map((e, i) => (
          <li key={`${e.timestamp}-${i}`} className="relative flex items-baseline gap-2 text-xs">
            <span className={`absolute -left-[17px] top-1.5 h-2 w-2 rounded-full ring-2 ring-ink-850 ${toneDot[KIND_TONE[e.kind]]}`} />
            <span className="mono shrink-0 text-slate-500">{timeOf(e)}</span>
            <span className="text-slate-300">{e.message}</span>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[11px] leading-snug text-slate-600">
        Timings come from controller log timestamps. The first failed probe is not the exact physical link-down time.
      </p>
    </div>
  );
}
