import { useState } from 'react';
import type { ReactNode } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PROJECT } from '../config/project';
import { useConnection } from '../context/ConnectionContext';
import { API_BASE_URL, API_CONFIGURED } from '../services/client';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-600/40 py-2.5 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200">{children}</span>
    </div>
  );
}

export default function SettingsPage() {
  const conn = useConnection();
  const [refreshInterval, setRefreshInterval] = useState('manual');

  return (
    <>
      <PageHeader title="Settings" description="Connection and project configuration. Values come from environment variables." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Backend connection">
          <Row label="Mode">
            <StatusBadge tone={conn.state === 'connected' ? 'ok' : conn.state === 'error' ? 'bad' : 'warn'}>
              {conn.state === 'connected' ? 'Backend API (historical data)' : conn.state === 'error' ? 'Unreachable · demo fallback' : conn.state === 'connecting' ? 'Connecting…' : 'Demo fallback'}
            </StatusBadge>
          </Row>
          <Row label="VITE_API_BASE_URL">
            <span className="mono">{API_BASE_URL || '(not set)'}</span>
          </Row>
          <Row label="Backend configured">{API_CONFIGURED ? 'Yes' : 'No (demo mode)'}</Row>
          {conn.health && (
            <>
              <Row label="API version">
                <span className="mono">{conn.health.version}</span>
              </Row>
              <Row label="Backend host OS">{conn.health.host_os}</Row>
              <Row label="Result files found">{conn.health.data_dir.files_found}</Row>
              <Row label="Backend status">
                <StatusBadge tone={conn.health.status === 'ok' ? 'ok' : 'warn'}>{conn.health.status}</StatusBadge>
              </Row>
            </>
          )}
          <Row label="Connection state">
            <span className="mono">{conn.state}</span>
          </Row>
          <Row label="Last checked">
            <span className="mono">{conn.lastChecked ? conn.lastChecked.toLocaleTimeString() : '—'}</span>
          </Row>
          {conn.error && <p className="mt-2 text-xs text-red-300">{conn.error}</p>}
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Set <span className="mono">VITE_API_BASE_URL</span> in <span className="mono">frontend/.env.local</span> and restart the dev server.
            The backend is read-only: it serves recorded results and repository configuration, never live network state.
          </p>
        </Card>

        <Card title="Dashboard preferences">
          <Row label="Refresh interval">
            <select value={refreshInterval} onChange={(e) => setRefreshInterval(e.target.value)} className="rounded-md border border-ink-500 bg-ink-900 px-2 py-1 text-xs text-slate-200">
              <option value="manual">Manual refresh</option>
              <option value="30">30 seconds (preference only)</option>
              <option value="60">1 minute (preference only)</option>
              <option value="300">5 minutes (preference only)</option>
            </select>
          </Row>
          <p className="mt-3 text-xs text-slate-500">This selection is a UI preference indicator; automatic polling is not enabled in this read-only stage.</p>
        </Card>
        <Card title="Project">
          <Row label="Title">{PROJECT.title}</Row>
          <Row label="Project code">
            <span className="mono">{PROJECT.code}</span>
          </Row>
          <Row label="Team">{PROJECT.team}</Row>
          <Row label="Probe destination">
            <span className="mono">{PROJECT.destination}</span>
          </Row>
          <Row label="Failure detection">{PROJECT.failureDetectionThreshold} consecutive failed probes</Row>
        </Card>
      </div>
    </>
  );
}
