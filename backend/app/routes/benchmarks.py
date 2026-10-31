from fastapi import APIRouter, Query

from ..config import load_settings
from ..schemas import BenchmarksResponse
from ..services import benchmarks as svc

router = APIRouter()


@router.get("/benchmarks", response_model=BenchmarksResponse, summary="M0 / P1 / P2 benchmark results")
def benchmarks(include_trials: bool = Query(False, description="Include every per-trial row (for charts)")) -> BenchmarksResponse:
    return svc.build(load_settings(), include_trials)
