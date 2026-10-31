import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { NAV_ITEMS } from '../../config/nav';
import { PROJECT } from '../../config/project';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-600/60 bg-ink-900 transition-transform duration-200 lg:w-60 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Primary navigation"
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-ink-600/60 px-4">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-100">{PROJECT.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Network Operations</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-ink-700 hover:text-slate-200 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-400/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/20'
                    : 'text-slate-400 hover:bg-ink-800 hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-ink-600/60 px-4 py-3">
          <div className="text-[11px] font-medium text-slate-400">Team {PROJECT.team}</div>
          <div className="mt-0.5 text-[10px] leading-snug text-slate-600">
            Linux namespace emulation. Results describe this test environment only.
          </div>
        </div>
      </aside>
    </>
  );
}
