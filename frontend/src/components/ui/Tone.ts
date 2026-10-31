export type Tone = 'ok' | 'bad' | 'warn' | 'info' | 'violet' | 'neutral';

export const toneText: Record<Tone, string> = {
  ok: 'text-emerald-400',
  bad: 'text-red-400',
  warn: 'text-amber-400',
  info: 'text-cyan-400',
  violet: 'text-violet-400',
  neutral: 'text-slate-400',
};

export const toneBadge: Record<Tone, string> = {
  ok: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  bad: 'border-red-400/25 bg-red-400/10 text-red-300',
  warn: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  info: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300',
  violet: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
  neutral: 'border-slate-500/25 bg-slate-500/10 text-slate-300',
};

export const toneDot: Record<Tone, string> = {
  ok: 'bg-emerald-400',
  bad: 'bg-red-400',
  warn: 'bg-amber-400',
  info: 'bg-cyan-400',
  violet: 'bg-violet-400',
  neutral: 'bg-slate-500',
};
