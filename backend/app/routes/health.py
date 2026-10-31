import platform

from fastapi import APIRouter

from ..config import API_VERSION, SERVICE_NAME, load_settings
from ..schemas import DataDirStatus, HealthResponse
from ..services.data_reader import utc_now

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Backend connection status")
def health() -> HealthResponse:
    s = load_settings()
    exists = s.data_dir.is_dir()
    count, readable = 0, False
    if exists:
        try:
            count = sum(1 for p in s.data_dir.rglob("*") if p.is_file())
            readable = True
        except OSError:
            readable = False
    ok = exists and readable and count > 0
    return HealthResponse(
        status="ok" if ok else "degraded", service=SERVICE_NAME, version=API_VERSION, timestamp=utc_now(),
        host_os=platform.system() or "unknown",
        data_dir=DataDirStatus(path=str(s.data_dir), exists=exists, readable=readable, files_found=count),
        scripts_dir_exists=s.scripts_dir.is_dir(),
    )
