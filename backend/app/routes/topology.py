from fastapi import APIRouter

from ..config import load_settings
from ..schemas import TopologyResponse
from ..services import topology as svc

router = APIRouter()


@router.get("/topology", response_model=TopologyResponse, summary="Network topology parsed from the SRv6 scripts")
def topology() -> TopologyResponse:
    return svc.build(load_settings())
