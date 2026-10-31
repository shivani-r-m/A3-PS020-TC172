import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { DataSource } from '../../types';
import { SourceTag } from './SourceTag';
import { toneText } from './Tone';
import type { Tone } from './Tone';

interface Props {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  source: DataSource;
}

export function StatCard({ label, value, unit, hint, icon: Icon, tone = 'neutral', source }: Props) {
  return (
    <div className="panel animate-fade-up p-3.5 transition-colors hover:border-ink-500/80">
      <div className="flex items-center justify-between gap-2">
        <span className="label truncate">{label}</span>
        <Icon className={`h-4 w-4 shrink-0 ${toneText[tone]}`} />
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`truncate text-xl font-semibold tracking-tight ${tone === 'neutral' ? 'text-slate-100' : toneText[tone]}`}>
          {value}
        </span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] text-slate-500">{hint}</span>
        <SourceTag source={source} />
      </div>
    </div>
  );
}
