# AIORI-3 SRv6 dashboard backend (Stage 2)

Read-only FastAPI service that exposes the **recorded** SRv6 experiment results to the React dashboard.

```
React dashboard (Windows, :5173) --HTTP GET--> FastAPI backend (:8000) --reads--> src/results + src/scripts (Ubuntu VM clone)
```

* Python 3.10+, FastAPI, Uvicorn, Pydantic. Standard library for CSV/text parsing.
* **Read-only.** No endpoint runs scripts or shell commands, changes routes/interfaces/namespaces, or accepts a file path.
  Only GET is allowed (other methods return 405). Scripts in `src/scripts` are *parsed as text*, never executed.
* **Historical, not live.** Every response has a `data_source` block (`kind`, `files`, `missing_files`, `last_modified`,
  `live_telemetry: false`). Live network state is a later stage.
* **Nothing is invented.** Aggregates are recomputed from the per-trial files and cross-checked against the repo's own
  summary files (`summary_file_check`); disagreements are reported, missing or malformed data becomes `warnings`.

## The Windows / Ubuntu VM limitation

The SRv6 results live in the Ubuntu VM. A backend running on Windows **cannot read files inside the VM** by itself.
Pick one:

| Option | How |
|---|---|
| **A. Run the backend in the Ubuntu VM** (recommended) | Reads the VM's own `src/results` directly. Make it reachable from Windows with a VirtualBox NAT port-forward (host 8000 -> guest 8000) or a bridged / host-only adapter. |
| B. Run on Windows against a copy | `git pull` the repo on Windows (results are committed) and point `AIORI_DATA_DIR` at that copy. Shows whatever has been committed, not the VM's live files. |
| C. VirtualBox shared folder | Share the VM's repo folder with Windows and point `AIORI_DATA_DIR` at it. |

## Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `AIORI_DATA_DIR` | `<repo>/src/results` | Result files (CSV / logs / summaries) |
| `AIORI_SCRIPTS_DIR` | `<AIORI_DATA_DIR>/../scripts` | SRv6 scripts, parsed for topology/SIDs |
| `AIORI_CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated browser origins allowed to call the API |

No secrets or credentials are used. If you open the dashboard via the VM's IP (`http://<vm-ip>:5173`), add that origin to `AIORI_CORS_ORIGINS`.

## Run - Ubuntu (VM)

```bash
cd ~/A3-PS020-TC172/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000      # 0.0.0.0 so Windows can reach it; use 127.0.0.1 for local-only
# check:
curl http://localhost:8000/api/health
```

## Run - Windows (PowerShell)

```powershell
cd C:\path\to\A3-PS020-TC172\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1          # if blocked: Set-ExecutionPolicy -Scope Process Bypass
pip install -r requirements.txt
# only if the results are NOT in ..\src\results relative to backend\ :
$env:AIORI_DATA_DIR = "C:\path\to\copy\of\src\results"
uvicorn app.main:app --host 127.0.0.1 --port 8000
# check:
Invoke-RestMethod http://localhost:8000/api/health
```

Interactive docs: http://localhost:8000/docs

## Endpoints (all GET)

| Endpoint | Returns |
|---|---|
| `/api/health` | status, version, timestamp, host OS, whether the data directory is readable |
| `/api/overview` | project info, the four modes (M0, M1-P1, M1-P2, M2) configured vs measured, latest benchmark, M2 headline, data source, last-updated, experiment dates |
| `/api/topology` | nodes, links, SIDs, P1/P2 paths parsed from `src/scripts`; failure link R2-R5 from the result summaries; link status is `unknown` |
| `/api/benchmarks[?include_trials=true]` | M0 / P1 / P2: packets, loss, mean/median-of-trial-average RTT, max RTT, durations; delta vs M0; `summary_file_check`; the earlier P1/P2 run kept separate |
| `/api/failover` | detection, path-installation and recovery times, ping verification, `measurement_scope`, every controller run in the log with its outcome |
| `/api/logs[?limit&severity&category&kind]` | newest-first controller events and result-file records, with timestamps and severity |

Notes on the data (also in the API responses): median RTT is the median of per-trial averages (per-packet RTTs are not stored);
the M2 log holds 5 controller runs of which 2 verified recovery - the API reports the latest as a **single trial** and does not average them;
file `last_modified` in a fresh git checkout is the checkout time, not the experiment time.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest -q          # run from backend/
```

Covers every endpoint against the real result files, CSV/JSON/log parsing, missing / empty / malformed / NUL-padded files,
summary mismatch detection, write-method rejection, absence of command or file endpoints, CORS, and error-message hygiene.
Tests work on a temporary copy of `src/`, never the real files.

## Layout

```
backend/app/main.py            app, CORS, error handler
backend/app/config.py          environment settings
backend/app/schemas.py         Pydantic response models
backend/app/routes/*.py        one router per endpoint
backend/app/services/*.py      data_reader (safe file access) + benchmarks / failover / topology / logs / overview
backend/tests/                 pytest suite
```
