/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FastAPI backend, e.g. http://localhost:8000. Empty = demo mode. */
  readonly VITE_API_BASE_URL?: string;
  /** "true" forces the demo fallback even when VITE_API_BASE_URL is set. */
  readonly VITE_USE_MOCK?: string;
  /** Optional per-request timeout in ms (default 8000). */
  readonly VITE_API_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
