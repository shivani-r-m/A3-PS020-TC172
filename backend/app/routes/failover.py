from fastapi import APIRouter

from ..config import load_settings
from ..schemas import FailoverResponse
from ..services import failover as svc

router = APIRouter()


@router.get("/failover", response_model=FailoverResponse, summary="Recorded M2 failover measurements")
def failover() -> FailoverResponse:
    return svc.build(load_settings())
