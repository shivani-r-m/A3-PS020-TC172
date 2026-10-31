from typing import Literal

from fastapi import APIRouter, Query

from ..config import load_settings
from ..schemas import LogsResponse
from ..services import logs as svc

router = APIRouter()


@router.get("/logs", response_model=LogsResponse, summary="Recent experiment log entries (newest first)")
def logs(
    limit: int = Query(100, ge=1, le=500),
    severity: Literal["info", "ok", "warn", "error"] | None = None,
    category: Literal["M0", "M1", "M2", "Benchmark"] | None = None,
    kind: Literal["event", "record"] | None = None,
) -> LogsResponse:
    return svc.build(load_settings(), limit=limit, severity=severity, category=category, kind=kind)
