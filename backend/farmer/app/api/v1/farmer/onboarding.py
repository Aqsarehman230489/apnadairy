# ApnaDairy — farmer onboarding endpoint (thin router).
# POST /api/v1/farmer/onboarding upserts the caller's web farmer_profiles row
# and ensures a matching farmers registry row exists. JWT auth on everything;
# the farmer identity always comes from the current_farmer dependency, never
# from the request body.

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import current_farmer
from app.schemas.farmer.onboarding import FarmerProfileOut, OnboardingIn
from app.services.farmer import onboarding_service

router = APIRouter(prefix="/api/v1/farmer", tags=["farmer-onboarding"])


@router.post("/onboarding", response_model=FarmerProfileOut)
def submit_onboarding(
    data: OnboardingIn,
    ctx: tuple[dict, dict | None, dict | None] = Depends(current_farmer),
) -> FarmerProfileOut:
    """Save the calling farmer's onboarding details (city required).

    Upserts farmer_profiles for the caller's profiles.id and creates the
    farmers registry row on first submit. Returns the saved profile.
    """
    profile, farmer_profile, _farmer_row = ctx
    try:
        saved = onboarding_service.save_onboarding(profile, farmer_profile, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return FarmerProfileOut.model_validate(saved)
