# ApnaDairy — Pydantic schemas for the farmer onboarding flow.
# OnboardingIn is the POST /api/v1/farmer/onboarding request body (web
# farmer_profiles columns); FarmerProfileOut is the saved profile row returned
# by that endpoint. English-only messages.

from pydantic import BaseModel, ConfigDict, Field, field_validator


class OnboardingIn(BaseModel):
    """Farmer onboarding details (one submit = full form, upserted)."""

    city: str = Field(
        min_length=2,
        max_length=40,
        description="Farmer's city (required, 2-40 characters)",
    )
    village: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=300)
    farm_name: str | None = Field(default=None, max_length=160)
    milk_type: str | None = Field(
        default=None, max_length=40, description="e.g. cow, buffalo, mixed"
    )
    cattle_count: int | None = Field(
        default=None, ge=0, le=500, description="Total cattle (0-500)"
    )
    daily_litres: float | None = Field(
        default=None,
        ge=0,
        le=5000,
        description="Maximum milk capacity in litres per day (0-5000)",
    )
    notes: str | None = Field(default=None, max_length=300)

    @field_validator("city")
    @classmethod
    def _city_required(cls, value: str) -> str:
        """City is required: reject blank/whitespace-only values."""
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("City is required.")
        return cleaned


class FarmerProfileOut(BaseModel):
    """The saved web farmer_profiles row returned after onboarding."""

    model_config = ConfigDict(from_attributes=True)

    user_id: str = Field(description="profiles.id of the farmer (PK)")
    photo_path: str | None = Field(
        default=None, description="Storage path of the profile photo, if uploaded"
    )
    city: str
    village: str | None = None
    address: str | None = None
    farm_name: str | None = None
    milk_type: str | None = None
    cattle_count: int | None = None
    daily_litres: float | None = None
    notes: str | None = None
    submitted_at: str | None = Field(
        default=None, description="ISO timestamp of the last onboarding submit"
    )
    rejection_reason: str | None = Field(
        default=None, description="Set by SuperAdmin when rejected"
    )
    verified_at: str | None = Field(
        default=None, description="ISO timestamp of SuperAdmin verification"
    )
