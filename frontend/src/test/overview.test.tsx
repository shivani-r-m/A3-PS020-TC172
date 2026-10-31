// Frontend loading / error / fallback behaviour. The "backend" is a fetch stub that replays
// responses captured from the real FastAPI backend (src/test/fixtures/*.json); the bundled
// fallback files are read from public/data exactly as the browser would fetch them.
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fx = (n: string) => JSON.parse(readFileSync(resolve(__dirname, 'fixtures', `${n}.json`), 'utf8'));
const pub = (p: string) => readFileSync(resolve(__dirname, '../../public', p), 'utf8');
const BACKEND = 'http://backend.test:8000';

type Handler = (url: URL) => Response | Promise<Response>;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const goodBackend: Handler = (u) => {
  const name = u.pathname.replace('/api/', '');
  return name in { health: 1, overview: 1, topology: 1, benchmarks: 1, failover: 1, logs: 1 } ? json(fx(name)) : json({}, 404);
};

function stubFetch(apiHandler: Handler | null) {
  const calls: string[] = [];
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    calls.push(url.href);
    if (url.href.startsWith(BACKEND)) {
      if (!apiHandler) throw new TypeError('Failed to fetch');
      return apiHandler(url);
    }
    if (url.pathname.startsWith('/data/')) {
      try { return new Response(pub(url.pathname.slice(1))); } catch { return new Response('', { status: 404 }); }
    }
    return new Response('', { status: 404 });
  }));
  return calls;
}

async function mount(apiUrl: string) {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', apiUrl);
  vi.stubEnv('VITE_USE_MOCK', '');
  const { ConnectionProvider } = await import('../context/ConnectionContext');
  const { default: OverviewPage } = await import('../pages/OverviewPage');
  return render(
    <MemoryRouter>
      <ConnectionProvider>
        <OverviewPage />
      </ConnectionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.useRealTimers());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('OverviewPage + API integration', () => {
  it('shows backend data, labelled as historical, with no demo tags', async () => {
    const calls = stubFetch(goodBackend);
    await mount(BACKEND);
    await waitFor(() => expect(screen.getByText('Historical data.')).toBeTruthy());
    await waitFor(() => expect(screen.getAllByText(/0\.05693/).length).toBeGreaterThan(0)); // P1 mean RTT, from /api/benchmarks
    expect(screen.getAllByText(/11\.405/).length).toBeGreaterThan(0); // failover trial, from /api/failover
    expect(screen.getByText('Backend API')).toBeTruthy();
    expect(screen.queryByText('Demo fallback')).toBeNull();
    expect(screen.queryByText('Backend unavailable.')).toBeNull();
    for (const p of ['/api/health', '/api/overview', '/api/benchmarks', '/api/failover', '/api/topology', '/api/logs']) {
      expect(calls.some((c) => c.startsWith(`${BACKEND}${p}`))).toBe(true);
    }
    // read-only: the dashboard only ever issues GETs
    const methods = (fetch as unknown as { mock: { calls: [unknown, RequestInit?][] } }).mock.calls.map((c) => c[1]?.method ?? 'GET');
    expect(new Set(methods)).toEqual(new Set(['GET']));
  });

  it('shows a loading state while the backend is slow', async () => {
    stubFetch(() => new Promise<Response>(() => {}));
    await mount(BACKEND);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('falls back to labelled demo data and reports the error when the backend is down', async () => {
    stubFetch(null);
    await mount(BACKEND);
    await waitFor(() => expect(screen.getByText('Backend unavailable.')).toBeTruthy());
    await waitFor(() => expect(screen.getAllByText(/0\.05693/).length).toBeGreaterThan(0)); // bundled copy of the recorded CSV
    expect(screen.getAllByText('Demo fallback').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Could not reach the backend/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Historical data.')).toBeNull();
  });

  it('treats an HTTP error as backend failure and falls back', async () => {
    stubFetch((u) => (u.pathname === '/api/health' ? json(fx('health')) : json({ detail: 'boom' }, 500)));
    await mount(BACKEND);
    await waitFor(() => expect(screen.getByText('Backend unavailable.')).toBeTruthy());
    expect(screen.getAllByText('Demo fallback').length).toBeGreaterThan(0);
  });

  it('rejects an unusable payload instead of showing blanks', async () => {
    stubFetch((u) => (u.pathname === '/api/benchmarks' ? json({ ...fx('benchmarks'), latest: null }) : goodBackend(u)));
    await mount(BACKEND);
    await waitFor(() => expect(screen.getByText('Backend unavailable.')).toBeTruthy());
    expect(screen.getByText(/returned no benchmark data/)).toBeTruthy();
  });

  it('demo mode (no backend URL) makes no API requests and says so', async () => {
    const calls = stubFetch(goodBackend);
    await mount('');
    await waitFor(() => expect(screen.getByText('Demo mode.')).toBeTruthy());
    await waitFor(() => expect(screen.getAllByText(/0\.05693/).length).toBeGreaterThan(0));
    expect(calls.filter((c) => c.includes('/api/'))).toHaveLength(0);
  });

  it('surfaces backend data warnings', async () => {
    stubFetch((u) => (u.pathname === '/api/overview' ? json({ ...fx('overview'), warnings: ['Missing file: src/results/final/x.csv'] }) : goodBackend(u)));
    await mount(BACKEND);
    await waitFor(() => expect(screen.getByText('Missing file: src/results/final/x.csv')).toBeTruthy());
  });
});
