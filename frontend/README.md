# AIORI-3 SRv6 Dashboard (frontend)

Network operations dashboard for **A3-PS020-TC172 — Local SRv6 Path Steering and Measured Failure Recovery** (Team NetNova).

React · Vite · TypeScript · Tailwind CSS · Recharts · Lucide · React Router.

This folder is self-contained. It never modifies `../src`.

## Stage 2: backend integration

The dashboard reads recorded results from the read-only FastAPI backend in `../backend` (see its README).
`VITE_API_BASE_URL` in `.env.local` points at it (default `http://localhost:8000`).

* **Backend reachable** — benchmarks, the M2 failover trial, topology links and recent activity come from the API
  (tagged *Recorded* / *Repo config*). These are historical results, not live telemetry; live status and active path show *Not monitored*.
* **Backend unreachable, or no URL set** — the page shows a red/amber banner and falls back to the bundled copy of the
  recorded files in `public/data` (tagged *Demo fallback*). Nothing is silently substituted.
* `VITE_USE_MOCK=true` forces the fallback; `VITE_API_TIMEOUT_MS` changes the 8 s request timeout.
* Only GET requests are ever sent. `npm test` runs the loading / error / fallback tests (they replay responses captured from the real backend).

`src/services/client.ts` (transport) → `api.ts` (endpoints) → `adapters.ts` (API → UI types) → `hooks/useApiData.ts` (fallback + labelling).

## Run locally

Requires Node.js 18+.

```bash
cd ~/A3-PS020-TC172/frontend      # the frontend/ folder next to src/
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
npm install
npm run dev
```

Open http://localhost:5173. Inside the VirtualBox VM the dev server also listens on all interfaces
(`host: true`), so you can open `http://<vm-ip>:5173` from the host machine.

Other commands:

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest: loading, error and fallback states
npm run build       # sync data + typecheck + production build into dist/
npm run preview     # serve the production build
npm run sync:data   # re-copy result files into public/data (runs automatically before dev/build)
```

## Where the data comes from (demo fallback copy)

| UI element | Source of truth |
|---|---|
| Benchmark summary | `src/results/final/comparison_summary_20261031.csv` |
| Per-trial data (Stage 3) | `src/results/final/{m0,p1,p2}_benchmark_20261031.csv` |
| M2 failover trial | `src/results/m2/failover_success_20261030.log` (last run that verified recovery) |
| Addresses, SIDs, paths | `src/scripts/00_topology.sh`, `20_m1_sids.sh`, `30_m1_p1.sh`, `31_m1_p2.sh` → `src/config/project.ts` |

`scripts/sync-data.mjs` copies the CSVs into `public/data/final/` and parses the M2 log into `public/data/m2/trial.json`.

Every metric card carries a source tag: **Live** (backend), **Recorded** (result files), **Repo config** (scripts),
**Mock** (UI-development placeholder) or **Unavailable**.

## Mock mode vs live mode

- `VITE_API_BASE_URL` empty → **mock mode**. Live state (network status, active path, link health) is placeholder data
  and is labelled *Mock*. Recorded benchmark and M2 data are still real. Network-changing actions are never sent and
  never reported as successful.
- `VITE_API_BASE_URL=http://<vm-ip>:8000` → **live mode**. `GET /api/status` is polled every 10 s; failures show
  "API unreachable" and values become *Unavailable* (no silent fallback to fake data).

Proposed endpoints (contracts only — not assumed to exist): `GET /api/status|topology|routing|benchmarks|failover|logs`,
`POST /api/routing/select`, `POST /api/failover/trigger`. A POST is treated as successful **only** if the response
contains `"confirmed": true`. Types are in `src/types/index.ts`; client code in `src/services/`.

## Structure

```
frontend/
├── scripts/sync-data.mjs        # results → public/data
├── public/data/                 # generated, derived from src/results
└── src/
    ├── config/                  # project facts (addresses, SIDs, paths), nav
    ├── types/                   # data + API contract types
    ├── services/                # client, api, mock, recorded-data loaders
    ├── context/                 # ConnectionContext (API/mock status)
    ├── hooks/                   # useAsync, useClock
    ├── lib/                     # csv + number formatting
    ├── data/                    # recorded activity entries (with source files)
    ├── components/{ui,layout,overview}/
    └── pages/                   # Overview, Settings, placeholders for Stages 2–3
```

## Status

- **Stage 1 (done):** project scaffold, layout, sidebar, top bar, Overview, API/mock service layer.
- Stage 2: topology, routing modes, path steering. Stage 3: benchmarks, failover, logs. Stage 4: polish + API hardening.
