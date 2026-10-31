"""Runtime configuration (environment variables only; no secrets are used or stored)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

API_VERSION = "2.0.0"
SERVICE_NAME = "aiori3-srv6-backend"

# backend/app/config.py -> parents[2] is the repository root.
_REPO_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_CORS = ("http://localhost:5173", "http://127.0.0.1:5173")


def _split(value: str | None, default: tuple[str, ...]) -> tuple[str, ...]:
    if not value or not value.strip():
        return default
    return tuple(v.strip().rstrip("/") for v in value.split(",") if v.strip())


@dataclass(frozen=True)
class Settings:
    #: Directory holding the recorded experiment results (the repo's ``src/results``).
    data_dir: Path
    #: Directory holding the SRv6 scripts (the repo's ``src/scripts``) - read only, never executed.
    scripts_dir: Path
    cors_origins: tuple[str, ...]
    #: M2 controller logs, in order of preference.
    m2_log_candidates: tuple[str, ...] = ("failover_success_20261030.log", "failover.log")


def load_settings() -> Settings:
    """Read settings from the environment on every call (keeps tests simple)."""
    data_dir = Path(os.environ.get("AIORI_DATA_DIR") or (_REPO_ROOT / "src" / "results"))
    scripts_dir = Path(os.environ.get("AIORI_SCRIPTS_DIR") or (data_dir.parent / "scripts"))
    return Settings(
        data_dir=data_dir.expanduser(),
        scripts_dir=scripts_dir.expanduser(),
        cors_origins=_split(os.environ.get("AIORI_CORS_ORIGINS"), DEFAULT_CORS),
    )
