export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse' | 'config';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly statusCode?: number;

  constructor(message: string, kind: ApiErrorKind, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.statusCode = statusCode;
  }
}

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

/** VITE_USE_MOCK=true forces the demo fallback even when a backend URL is configured. */
const FORCE_DEMO = (import.meta.env.VITE_USE_MOCK ?? '').trim().toLowerCase() === 'true';

/** True when the dashboard should try to reach the backend. */
export const API_CONFIGURED: boolean = API_BASE_URL !== '' && !FORCE_DEMO;

const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) > 0 ? Number(import.meta.env.VITE_API_TIMEOUT_MS) : 8000;

/** GET-only JSON request. The backend is read-only, so no other method is ever sent. */
export async function getJson<T>(path: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
  if (!API_CONFIGURED) {
    throw new ApiError('No backend configured (VITE_API_BASE_URL is empty or demo mode is forced).', 'config');
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(`Backend did not respond within ${timeoutMs / 1000}s.`, 'timeout');
    }
    throw new ApiError(`Could not reach the backend at ${API_BASE_URL} (not running, wrong URL, or blocked by CORS).`, 'network');
  } finally {
    window.clearTimeout(timer);
  }

  if (!response.ok) {
    throw new ApiError(`Backend returned HTTP ${response.status} for ${path}.`, 'http', response.status);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('Backend returned a response that is not valid JSON.', 'parse');
  }
}
