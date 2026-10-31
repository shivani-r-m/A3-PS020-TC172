import type { LogCategory, LogEntry, LogStatus } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { toneDot } from '../ui/Tone';
import type { Tone } from '../ui/Tone';

const CATEGORY_TONE: Record<LogCategory, Tone> = {
  M0: 'neutral',
  M1: 'info',
  M2: 'violet',
  Benchmark: 'ok',
};

const STATUS_TONE: Record<LogStatus, Tone> = {
  ok: 'ok',
  warn: 'warn',
  error: 'bad',
  info: 'info',
};

export function RecentActivity({ entries }: { entries: LogEntry[] }) {
  return (
    <ul className="divide-y divide-ink-600/40">
      {entries.map((e) => (
        <li key={e.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[STATUS_TONE[e.status]]}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <StatusBadge tone={CATEGORY_TONE[e.category]}>{e.category}</StatusBadge>
              <span className="text-[13px] text-slate-200">{e.description}</span>
            </div>
            {e.sourceFile && <div className="mono mt-1 truncate text-slate-600">{e.sourceFile}</div>}
          </div>
          <time className="mono shrink-0 text-right text-slate-500">{e.timestamp}</time>
        </li>
      ))}
    </ul>
  );
}
