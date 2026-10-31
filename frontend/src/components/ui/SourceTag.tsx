import type { DataSource } from '../../types';

const STYLE: Record<DataSource, { label: string; cls: string; title: string }> = {
  live: {
    label: 'Live',
    cls: 'border-emerald-400/30 text-emerald-300',
    title: 'Answered by the backend API just now',
  },
  recorded: {
    label: 'Recorded',
    cls: 'border-cyan-400/30 text-cyan-300',
    title: 'Recorded experiment results (historical files, not live telemetry)',
  },
  config: {
    label: 'Repo config',
    cls: 'border-violet-400/30 text-violet-300',
    title: 'Taken from the repository scripts (topology / SIDs)',
  },
  mock: {
    label: 'Demo fallback',
    cls: 'border-amber-400/40 text-amber-300',
    title: 'Not fetched from the backend: bundled copy of recorded files and/or placeholder values',
  },
  unavailable: {
    label: 'Unavailable',
    cls: 'border-slate-500/40 text-slate-400',
    title: 'No data available',
  },
};

export function SourceTag({ source }: { source: DataSource }) {
  const s = STYLE[source];
  return (
    <span
      title={s.title}
      className={`inline-flex shrink-0 items-center rounded border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
