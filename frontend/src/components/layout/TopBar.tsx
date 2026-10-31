import { Menu } from 'lucide-react';
import { PROJECT } from '../../config/project';
import { useConnection } from '../../context/ConnectionContext';
import type { ConnectionState } from '../../context/ConnectionContext';
import { useClock } from '../../hooks/useClock';
import { StatusBadge } from '../ui/StatusBadge';
import type { Tone } from '../ui/Tone';

const CONNECTION_UI: Record<ConnectionState, { label: string; tone: Tone; pulse: boolean }> = {
  demo: { label: 'Demo data', tone: 'warn', pulse: false },
  connecting: { label: 'Connecting…', tone: 'info', pulse: true },
  connected: { label: 'API connected', tone: 'ok', pulse: true },
  error: { label: 'API unreachable · demo data', tone: 'bad', pulse: false },
};

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { state, health, demo, error, lastChecked } = useConnection();
  const now = useClock();
  const conn = CONNECTION_UI[state];

  const env = state === 'connected' && health ? `Backend · ${health.host_os}` : 'Demo';
  const envTone: Tone = state === 'connected' ? 'ok' : demo ? 'warn' : 'neutral';

  const date = now.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString(undefined, { hour12: false });

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-ink-600/60 bg-ink-900/85 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onMenu}
        className="rounded-md p-1.5 text-slate-400 hover:bg-ink-700 hover:text-slate-200 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-semibold text-slate-100">{PROJECT.name}</div>
        <div className="mono truncate text-[11px] text-slate-500">{PROJECT.code}</div>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-1.5 md:flex">
          <span className="label">Env</span>
          <StatusBadge tone={envTone}>{env}</StatusBadge>
        </div>

        <div title={error ?? (lastChecked ? `Last checked ${lastChecked.toLocaleTimeString()}` : '')}>
          <StatusBadge tone={conn.tone} dot pulse={conn.pulse}>
            {conn.label}
          </StatusBadge>
        </div>

        <div className="hidden text-right leading-tight sm:block">
          <div className="mono text-slate-200">{time}</div>
          <div className="text-[10px] text-slate-500">{date}</div>
        </div>
      </div>
    </header>
  );
}
