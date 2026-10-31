import { Activity, AlertTriangle, CalendarClock, CheckCircle2, Database, Gauge, Info, Network, RefreshCw, Route, ServerCog, Timer } from 'lucide-react';
import { BenchmarkMini } from '../components/overview/BenchmarkMini';
import { FailoverSummary } from '../components/overview/FailoverSummary';
import { MiniTopology } from '../components/overview/MiniTopology';
import { ModeSummary } from '../components/overview/ModeSummary';
import { RecentActivity } from '../components/overview/RecentActivity';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { SourceTag } from '../components/ui/SourceTag';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { Tone } from '../components/ui/Tone';
import { LINKS, ROUTERS } from '../config/project';
import { useConnection } from '../context/ConnectionContext';
import { RECORDED_ACTIVITY } from '../data/recorded';
import { useApiData } from '../hooks/useApiData';
import { fmtInt, fmtRtt, fmtSeconds } from '../lib/format';
import { toBenchmarkRows, toFailoverTrial, toLogEntries } from '../services/adapters';
import { getBenchmarks, getFailover, getLogs, getOverview, getTopology } from '../services/api';
import { API_CONFIGURED } from '../services/client';
import { loadBenchmarkSummary, loadFailoverTrial } from '../services/recorded';
import type { ApiOverview, ApiTopology } from '../types/api';

type TopoLinks = Pick<ApiTopology, 'links'>;

/** Demo fallback for the link list: the same facts, bundled in config/project.ts. */
const fallbackTopology = async (): Promise<TopoLinks> => ({
  links: LINKS.map((l) => ({ id: l.id, a: l.a, b: l.b, subnet: l.subnet, failure_link: !!l.failureLink, status: 'unknown' as const })),
});

function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i % 2 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

function Banner({ tone, title, children }: { tone: 'amber' | 'red' | 'sky'; title: string; children: React.ReactNode }) {
  const cls = {
    amber: 'border-amber-400/25 bg-amber-400/5 text-amber-200/90',
    red: 'border-red-400/25 bg-red-400/5 text-red-200/90',
    sky: 'border-sky-400/25 bg-sky-400/5 text-sky-200/90',
  }[tone];
  const head = { amber: 'text-amber-300', red: 'text-red-300', sky: 'text-sky-300' }[tone];
  const icon = { amber: 'text-amber-400', red: 'text-red-400', sky: 'text-sky-400' }[tone];
  return (
    <div role={tone === 'red' ? 'alert' : 'status'} className={`mb-4 flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs ${cls}`}>
      {tone === 'sky' ? <Info className={`mt-px h-4 w-4 shrink-0 ${icon}`} /> : <AlertTriangle className={`mt-px h-4 w-4 shrink-0 ${icon}`} />}
      <div>
        <strong className={`font-semibold ${head}`}>{title}</strong> {children}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const conn = useConnection();
  const overview = useApiData<ApiOverview | null>(getOverview, async () => null);
  const bench = useApiData(() => getBenchmarks().then(toBenchmarkRows), loadBenchmarkSummary);
  const trial = useApiData(() => getFailover().then(toFailoverTrial), loadFailoverTrial);
  const topo = useApiData<TopoLinks>(getTopology, fallbackTopology);
  const logs = useApiData(() => getLogs({ kind: 'record', limit: 8 }).then(toLogEntries), async () => RECORDED_ACTIVITY);

  const all = [overview, bench, trial, topo, logs];
  const loading = all.some((x) => x.loading) || conn.checking;
  const links = topo.data?.links ?? [];
  const backendProblem = conn.state === 'error' ? conn.error : (all.find((x) => x.backendError)?.backendError?.message ?? null);
  const apiWarnings = overview.data?.warnings ?? [];

  // Overall packet loss across the three final benchmark runs (recorded data, not live).
  const benchTotals = bench.data
    ? bench.data.reduce((a, r) => ({ tx: a.tx + r.transmitted, rx: a.rx + r.received }), { tx: 0, rx: 0 })
    : null;
  const p1 = bench.data?.find((r) => r.mode === 'P1_SRv6');
  const p2 = bench.data?.find((r) => r.mode === 'P2_SRv6');
  const m0 = bench.data?.find((r) => r.mode === 'M0_OSPFv3');

  const benchDate = overview.data?.experiment_dates.benchmark_run ?? (API_CONFIGURED ? null : '2026-10-31');
  const lastUpdated = overview.data?.last_updated ? new Date(overview.data.last_updated).toLocaleString() : null;

  const refresh = () => {
    conn.refresh();
    all.forEach((x) => x.reload());
  };

  const connValue = { demo: 'Demo', connecting: 'Connecting…', connected: 'Backend API', error: 'Offline' }[conn.state];
  const connTone: Tone = conn.state === 'connected' ? 'ok' : conn.state === 'connecting' ? 'info' : conn.state === 'error' ? 'bad' : 'warn';
  const connHint =
    conn.state === 'connected'
      ? `Historical files · API v${conn.health?.version ?? '?'}`
      : conn.state === 'error'
        ? 'Showing demo fallback'
        : conn.state === 'demo'
          ? 'Set VITE_API_BASE_URL for the backend'
          : 'Checking backend…';

  return (
    <>
      <PageHeader
        title="Overview"
        description="Local SRv6 path steering and measured failure recovery — five-router Linux namespace topology."
        actions={
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-300 disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Loading…' : 'Refresh'}
          </button>
        }
      />

      {!API_CONFIGURED && (
        <Banner tone="amber" title="Demo mode.">
          No backend is configured (<span className="mono">VITE_API_BASE_URL</span>). Benchmarks and the failover trial are bundled copies of the
          recorded result files; nothing here was fetched from the backend.
        </Banner>
      )}
      {API_CONFIGURED && backendProblem && (
        <Banner tone="red" title="Backend unavailable.">
          {backendProblem} Showing the demo fallback (bundled copies of the recorded files). Use Refresh to retry.
        </Banner>
      )}
      {conn.state === 'connected' && !backendProblem && (
        <Banner tone="sky" title="Historical data.">
          Values come from experiment results recorded in the repository and served by the backend. This is not live network telemetry, so
          live status, active path and link health are not shown.
          {lastUpdated && <span className="text-sky-200/60"> Backend data files last modified {lastUpdated}.</span>}
        </Banner>
      )}
      {apiWarnings.length > 0 && (
        <Banner tone="amber" title={`Backend data warnings (${apiWarnings.length}).`}>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {apiWarnings.slice(0, 4).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Banner>
      )}

      {/* ---- Metric cards ---------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Network status"
          icon={Activity}
          value="Not monitored"
          tone="neutral"
          hint="Live telemetry is not available; recorded results only"
          source="unavailable"
        />
        <StatCard label="Routers" icon={Network} value={ROUTERS.length} hint="R1–R5 + S and D endpoints" tone="info" source="config" />
        <StatCard
          label="Latest benchmark run"
          icon={CalendarClock}
          value={benchDate ?? (overview.loading ? '…' : 'Unavailable')}
          hint={bench.data ? `${bench.data.length} modes · ${bench.data[0].trials} trials each` : 'No benchmark data'}
          tone={benchDate ? 'info' : 'neutral'}
          source={benchDate ? overview.source : 'unavailable'}
        />
        <StatCard
          label="Active path"
          icon={Route}
          value="Not monitored"
          tone="neutral"
          hint="Needs live routing telemetry (later stage)"
          source="unavailable"
        />
        <StatCard
          label="Packet loss · final benchmark"
          icon={Gauge}
          value={benchTotals ? Number((((benchTotals.tx - benchTotals.rx) / benchTotals.tx) * 100).toFixed(3)) : 'Unavailable'}
          unit={benchTotals ? '%' : undefined}
          tone={benchTotals ? (benchTotals.tx === benchTotals.rx ? 'ok' : 'warn') : 'neutral'}
          hint={benchTotals ? `${fmtInt(benchTotals.rx)}/${fmtInt(benchTotals.tx)} received · M0, P1, P2` : 'No benchmark data'}
          source={bench.data ? bench.source : 'unavailable'}
        />
        <StatCard
          label="Mean RTT · P1 / P2"
          icon={Timer}
          value={p1 && p2 ? `${fmtRtt(p1.meanTrialAvgRttMs)} / ${fmtRtt(p2.meanTrialAvgRttMs)}` : 'Unavailable'}
          unit={p1 && p2 ? 'ms' : undefined}
          hint={m0 ? `Mean trial avg · M0 ${fmtRtt(m0.meanTrialAvgRttMs)} ms` : 'No benchmark data'}
          source={bench.data ? bench.source : 'unavailable'}
        />
        <StatCard
          label="Last failover"
          icon={CheckCircle2}
          value={trial.data ? 'Recovered' : trial.loading ? '…' : 'Unavailable'}
          tone={trial.data ? 'ok' : 'neutral'}
          hint={trial.data ? `${fmtSeconds(trial.data.metrics.firstFailToRecoveryS)} s · one recorded trial` : 'No trial data'}
          source={trial.data ? trial.source : 'unavailable'}
        />
        <StatCard
          label="Data source"
          icon={conn.demo ? Database : ServerCog}
          value={connValue}
          tone={connTone}
          hint={connHint}
          source={conn.state === 'connected' ? 'live' : conn.state === 'connecting' ? 'unavailable' : 'mock'}
        />
      </div>

      {/* ---- Topology + modes ------------------------------------------------ */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Network topology"
          subtitle="S → R1 → R2 → R5 → D (P1)  ·  S → R1 → R3 → R4 → R5 → D (P2)"
          action={<SourceTag source={topo.data ? (topo.source === 'recorded' ? 'config' : topo.source) : 'unavailable'} />}
        >
          <MiniTopology activePath={null} linkStatus={null} />
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {topo.loading && links.length === 0 && <CardSkeleton lines={4} />}
            {links.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">
                  <span className="text-slate-200">
                    {l.a}–{l.b}
                  </span>
                  <span className="mono ml-2 text-slate-600">{l.subnet}</span>
                  {l.failure_link && <span className="ml-2 text-[10px] text-amber-400/80">failure-test link</span>}
                </span>
                <StatusBadge tone="neutral" dot>
                  status unknown
                </StatusBadge>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-snug text-slate-600">
            Link status is unknown: the backend reads recorded files and does not query the running namespaces.
          </p>
        </Card>

        <Card title="Routing mode summary" subtitle="Configured vs measured">
          {bench.loading || trial.loading ? (
            <CardSkeleton lines={6} />
          ) : (
            <ModeSummary activeMode={null} bench={bench.data} trial={trial.data} />
          )}
        </Card>
      </div>

      {/* ---- Benchmark + failover ------------------------------------------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Latest benchmark comparison"
          subtitle={`Mean of per-trial average RTT${benchDate ? ` · final run ${benchDate}` : ''}`}
          action={<SourceTag source={bench.data ? bench.source : 'unavailable'} />}
        >
          {bench.loading ? (
            <CardSkeleton lines={7} />
          ) : bench.error ? (
            <ErrorState message={bench.error.message} onRetry={bench.reload} />
          ) : bench.data && bench.data.length > 0 ? (
            <BenchmarkMini rows={bench.data} />
          ) : (
            <EmptyState title="No benchmark data" />
          )}
        </Card>

        <Card title="Failover event summary" subtitle="M2 controller log" action={<SourceTag source={trial.data ? trial.source : 'unavailable'} />}>
          {trial.loading ? (
            <CardSkeleton lines={7} />
          ) : trial.error ? (
            <ErrorState message={trial.error.message} onRetry={trial.reload} />
          ) : trial.data ? (
            <FailoverSummary trial={trial.data} />
          ) : (
            <EmptyState title="No failover trial recorded" />
          )}
        </Card>
      </div>

      {/* ---- Recent activity ------------------------------------------------- */}
      <Card
        className="mt-4"
        title="Recent experiment activity"
        subtitle="From the recorded result files"
        action={<SourceTag source={logs.data ? logs.source : 'unavailable'} />}
      >
        {logs.loading ? (
          <CardSkeleton lines={5} />
        ) : logs.error ? (
          <ErrorState message={logs.error.message} onRetry={logs.reload} />
        ) : logs.data && logs.data.length > 0 ? (
          <RecentActivity entries={logs.data} />
        ) : (
          <EmptyState title="No recorded activity" />
        )}
      </Card>
    </>
  );
}
