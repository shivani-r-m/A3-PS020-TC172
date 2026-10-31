from fastapi import APIRouter

from ..config import load_settings
from ..schemas import OverviewResponse
from ..services import overview as svc

router = APIRouter()


@router.get("/overview", response_model=OverviewResponse, summary="Experiment summary and routing modes")
def overview() -> OverviewResponse:
    return svc.build(load_settings())
