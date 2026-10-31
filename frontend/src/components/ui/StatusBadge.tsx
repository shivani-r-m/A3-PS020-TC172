import type { ReactNode } from 'react';
import { toneBadge, toneDot } from './Tone';
import type { Tone } from './Tone';

interface Props {
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ tone = 'neutral', dot = false, pulse = false, children, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneBadge[tone]} ${className}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${toneDot[tone]} ${pulse ? 'animate-pulse-dot' : ''}`} />
      )}
      {children}
    </span>
  );
}
