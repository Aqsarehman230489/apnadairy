# ApnaDairy — Farmer home stats HTTP router.
# Thin layer: auth dependency -> service call -> validated response.

from fastapi import APIRouter, Depends

from app.core.deps import current_farmer
from app.schemas.farmer.dashboard import FarmerStatsResponse
from app.services.farmer.dashboard_service import get_farmer_stats

router = APIRouter(prefix="/api/v1/farmer", tags=["farmer-stats"])


@router.get("/stats", response_model=FarmerStatsResponse)
def read_farmer_stats(farmer=Depends(current_farmer)) -> FarmerStatsResponse:
    """Return the home stats payload for the authenticated farmer.

    current_farmer resolves the caller from the JWT: it returns
    (profile, farmer_profile|None, farmer_row|None), where farmer_row is
    the web-project farmers row (or None when the farmer has no web row
    yet). The identity is never taken from query params, so one farmer
    cannot read another farmer's stats.
    """
    _, _, farmer_row = farmer
    return get_farmer_stats(farmer_row)
