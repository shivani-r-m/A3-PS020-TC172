import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getHealth } from '../services/api';
import { API_CONFIGURED } from '../services/client';
import type { ApiHealth } from '../types/api';

/**
 *  demo       – no backend configured (or demo forced): everything shown is the labelled fallback
 *  connecting – first health check in flight
 *  connected  – /api/health answered
 *  error      – backend configured but unreachable: demo fallback is shown
 */
export type ConnectionState = 'demo' | 'connecting' | 'connected' | 'error';

interface ConnectionValue {
  state: ConnectionState;
  /** True when the dashboard is not showing backend data. */
  demo: boolean;
  health: ApiHealth | null;
  error: string | null;
  lastChecked: Date | null;
  checking: boolean;
  refresh: () => void;
}

const ConnectionContext = createContext<ConnectionValue | null>(null);

const POLL_MS = 10_000;

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConnectionState>(API_CONFIGURED ? 'connecting' : 'demo');
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(API_CONFIGURED);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!API_CONFIGURED) return;
    let cancelled = false;

    const load = () => {
      setChecking(true);
      getHealth()
        .then((h) => {
          if (cancelled) return;
          setHealth(h);
          setError(null);
          setState('connected');
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setHealth(null);
          setError(e instanceof Error ? e.message : String(e));
          setState('error');
        })
        .finally(() => {
          if (cancelled) return;
          setLastChecked(new Date());
          setChecking(false);
        });
    };

    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const value = useMemo<ConnectionValue>(
    () => ({ state, demo: state !== 'connected', health, error, lastChecked, checking, refresh }),
    [state, health, error, lastChecked, checking, refresh],
  );

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection(): ConnectionValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error('useConnection must be used inside <ConnectionProvider>');
  return ctx;
}
