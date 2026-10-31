import type {
  ApiBenchmarks,
  ApiFailover,
  ApiHealth,
  ApiLogs,
  ApiOverview,
  ApiTopology,
} from '../types/api';
import { getJson } from './client';

/**
 * API service layer for the read-only FastAPI backend (Stage 2).
 * Pure transport: no fallback happens here. The demo fallback is applied, and labelled,
 * by `useApiData`, so fake/bundled data can never be mistaken for a backend response.
 */
export const getHealth = () => getJson<ApiHealth>('/api/health', 4000);
export const getOverview = () => getJson<ApiOverview>('/api/overview');
export const getTopology = () => getJson<ApiTopology>('/api/topology');
export const getBenchmarks = () => getJson<ApiBenchmarks>('/api/benchmarks');
export const getFailover = () => getJson<ApiFailover>('/api/failover');
export const getLogs = (params: { limit?: number; kind?: 'event' | 'record'; category?: string; severity?: string } = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
  const qs = q.toString();
  return getJson<ApiLogs>(`/api/logs${qs ? `?${qs}` : ''}`);
};
