import { useCallback, useEffect, useRef, useState } from 'react';
import { API_CONFIGURED } from '../services/client';
import type { DataSource } from '../types';

export interface ApiData<T> {
  data: T | null;
  /** 'recorded' = served by the backend; 'mock' = labelled demo fallback; 'unavailable' = nothing. */
  source: DataSource;
  /** Why the backend was not used (null when it was used, or when no backend is configured). */
  backendError: Error | null;
  /** Set only if the demo fallback itself failed, so there is nothing to show. */
  error: Error | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Loads data from the backend; if that fails (or no backend is configured) falls back to
 * `fallback()` and marks the result as demo data. A backend that answers but returns an
 * unusable payload counts as a failure and is also surfaced, never hidden.
 */
export function useApiData<T>(live: () => Promise<T>, fallback: () => Promise<T>): ApiData<T> {
  const [state, setState] = useState<Omit<ApiData<T>, 'reload'>>({
    data: null,
    source: 'unavailable',
    backendError: null,
    error: null,
    loading: true,
  });
  const [tick, setTick] = useState(0);
  const liveRef = useRef(live);
  const fallbackRef = useRef(fallback);
  liveRef.current = live;
  fallbackRef.current = fallback;

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    (async () => {
      let backendError: Error | null = null;
      if (API_CONFIGURED) {
        try {
          const data = await liveRef.current();
          if (!cancelled) setState({ data, source: 'recorded', backendError: null, error: null, loading: false });
          return;
        } catch (e) {
          backendError = e instanceof Error ? e : new Error(String(e));
        }
      }
      try {
        const data = await fallbackRef.current();
        if (!cancelled) setState({ data, source: 'mock', backendError, error: null, loading: false });
      } catch (e) {
        if (!cancelled) {
          setState({
            data: null,
            source: 'unavailable',
            backendError,
            error: e instanceof Error ? e : new Error(String(e)),
            loading: false,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
