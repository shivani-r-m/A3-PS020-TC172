import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtDurationMs, fmtInt, fmtPercent, fmtRtt } from '../../lib/format';
import type { BenchmarkMode, BenchmarkSummaryRow } from '../../types';

export const MODE_META: Record<BenchmarkMode, { label: string; color: string }> = {
  M0_OSPFv3: { label: 'M0 OSPFv3', color: '#94a3b8' },
  P1_SRv6: { label: 'P1 SRv6', color: '#22d3ee' },
  P2_SRv6: { label: 'P2 SRv6', color: '#a78bfa' },
};

export function BenchmarkMini({ rows }: { rows: BenchmarkSummaryRow[] }) {
  const data = rows.map((r) => ({
    name: MODE_META[r.mode].label,
    color: MODE_META[r.mode].color,
    value: r.meanTrialAvgRttMs,
  }));

  return (
    <div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid stroke="#18233c" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
              label={{ value: 'ms', position: 'insideTopLeft', fill: '#64748b', fontSize: 10, offset: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.06)' }}
              contentStyle={{ background: '#0d1526', border: '1px solid #233252', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(v: unknown) => [`${fmtRtt(Number(v))} ms`, 'Mean trial avg RTT'] as [string, string]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead>
            <tr className="label border-b border-ink-600/50">
              <th className="py-1.5 pr-3 font-medium">Mode</th>
              <th className="py-1.5 pr-3 text-right font-medium">Received</th>
              <th className="py-1.5 pr-3 text-right font-medium">Loss %</th>
              <th className="py-1.5 pr-3 text-right font-medium">Median RTT</th>
              <th className="py-1.5 pr-3 text-right font-medium">Mean dur.</th>
              <th className="py-1.5 text-right font-medium">Max RTT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.mode} className="border-b border-ink-600/30 last:border-0">
                <td className="py-1.5 pr-3">
                  <span className="mr-2 inline-block h-2 w-2 rounded-sm" style={{ background: MODE_META[r.mode].color }} />
                  <span className="text-slate-200">{MODE_META[r.mode].label}</span>
                </td>
                <td className="mono py-1.5 pr-3 text-right">
                  {fmtInt(r.received)}/{fmtInt(r.transmitted)}
                </td>
                <td className="mono py-1.5 pr-3 text-right">{fmtPercent(r.packetLossPercent)}</td>
                <td className="mono py-1.5 pr-3 text-right">{fmtRtt(r.medianTrialAvgRttMs)} ms</td>
                <td className="mono py-1.5 pr-3 text-right">{fmtDurationMs(r.meanTrialDurationMs)} ms</td>
                <td className="mono py-1.5 text-right">{fmtRtt(r.highestObservedRttMs)} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-600">
        {rows[0]?.trials} trials × 1,000 packets per mode. Highest observed RTTs are kept, not discarded.
      </p>
    </div>
  );
}
