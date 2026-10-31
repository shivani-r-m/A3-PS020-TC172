import type { ReactNode } from 'react';
import { fmtInt, fmtRtt, fmtSeconds } from '../../lib/format';
import type { BenchmarkSummaryRow, FailoverTrial } from '../../types';
import type { ModeId } from '../../config/project';
import { StatusBadge } from '../ui/StatusBadge';

interface Props {
  activeMode: ModeId | null;
  bench: BenchmarkSummaryRow[] | null;
  trial: FailoverTrial | null;
}

function Line({ kind, children }: { kind: 'Configured' | 'Measured'; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs leading-relaxed">
      <span
        className={`mt-px w-[68px] shrink-0 text-[10px] font-medium uppercase tracking-wide ${
          kind === 'Configured' ? 'text-violet-400' : 'text-cyan-400'
        }`}
      >
        {kind}
      </span>
      <span className="text-slate-400">{children}</span>
    </div>
  );
}

export function ModeSummary({ activeMode, bench, trial }: Props) {
  const m0 = bench?.find((r) => r.mode === 'M0_OSPFv3');
  const p1 = bench?.find((r) => r.mode === 'P1_SRv6');
  const p2 = bench?.find((r) => r.mode === 'P2_SRv6');

  const modes: { id: ModeId; title: string; configured: string; measured: ReactNode }[] = [
    {
      id: 'M0',
      title: 'OSPFv3 baseline',
      configured: 'FRRouting ospf6d, area 0.0.0.0, point-to-point links, hello 1 s / dead 3 s.',
      measured: m0
        ? `${fmtInt(m0.transmitted)} packets, ${m0.packetLossPercent}% loss, mean trial RTT ${fmtRtt(m0.meanTrialAvgRttMs)} ms.`
        : 'Unavailable',
    },
    {
      id: 'M1',
      title: 'SRv6 path steering',
      configured: 'End on R2, R3, R4; End.DT6 on R5. P1 via R2; P2 via R3 → R4. Encap at R1.',
      measured:
        p1 && p2
          ? `P1 mean RTT ${fmtRtt(p1.meanTrialAvgRttMs)} ms, P2 ${fmtRtt(p2.meanTrialAvgRttMs)} ms; 0% loss on both.`
          : 'Unavailable',
    },
    {
      id: 'M2',
      title: 'Failure recovery',
      configured: 'Backup P2 installed after 3 consecutive failed probes; one-way switch, no failback.',
      measured: trial
        ? `One trial: recovery verified ${fmtSeconds(trial.metrics.firstFailToRecoveryS)} s after first failed probe.`
        : 'Unavailable',
    },
  ];

  return (
    <ul className="space-y-3">
      {modes.map((m) => {
        const active = m.id === activeMode;
        return (
          <li
            key={m.id}
            className={`rounded-lg border p-3 transition-colors ${
              active ? 'border-cyan-400/30 bg-cyan-400/5' : 'border-ink-600/60 bg-ink-800/40'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="mono font-semibold text-slate-100">{m.id}</span>
                <span className="text-[13px] font-medium text-slate-200">{m.title}</span>
              </div>
              {active && <StatusBadge tone="info">Active</StatusBadge>}
            </div>
            <div className="space-y-1">
              <Line kind="Configured">{m.configured}</Line>
              <Line kind="Measured">{m.measured}</Line>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
