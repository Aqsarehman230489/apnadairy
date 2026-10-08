# ApnaDairy — farmer verification status endpoint (read-only).
# The SuperAdmin verifies farmer profiles via the web dashboard; the mobile
# portal only READS the outcome from the web farmer_profiles row:
#   verified  -> farmer_profiles.verified_at is set
#   rejected  -> rejection_reason is set (and verified_at is not)
#   pending   -> neither is set (including no farmer_profiles row yet)

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.deps import current_farmer

router = APIRouter(prefix="/api/v1/farmer", tags=["farmer-verification"])


class VerificationStatusOut(BaseModel):
    """Read-only verification state derived from the web farmer_profiles row."""

    status: str = Field(description="verified | rejected | pending")
    rejection_reason: str | None = Field(
        default=None, description="Why rejected (null unless status is rejected)"
    )


@router.get("/verification-status", response_model=VerificationStatusOut)
def read_verification_status(
    ctx: tuple[dict, dict | None, dict | None] = Depends(current_farmer),
) -> VerificationStatusOut:
    """Return the calling farmer's verification state (SuperAdmin decides)."""
    _profile, farmer_profile, _farmer_row = ctx
    if farmer_profile and farmer_profile.get("verified_at"):
        return VerificationStatusOut(status="verified")
    if farmer_profile and farmer_profile.get("rejection_reason"):
        return VerificationStatusOut(
            status="rejected", rejection_reason=farmer_profile.get("rejection_reason")
        )
    return VerificationStatusOut(status="pending")
