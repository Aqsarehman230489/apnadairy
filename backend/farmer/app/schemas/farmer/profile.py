# ApnaDairy — Pydantic schemas for farmer profile read/update.
# PersonalUpdate / FarmUpdate are partial-update bodies (all fields optional);
# ProfileOut is what the API returns (never includes secrets or internal ids).

from pydantic import BaseModel, ConfigDict, Field


class PersonalUpdate(BaseModel):
    """Editable personal fields (name/phone). Both optional for partial update."""
    name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=20)


class FarmUpdate(BaseModel):
    """Editable farm fields. All optional for partial update."""
    farm_name: str | None = Field(default=None, max_length=160)
    village: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=120)
    tehsil: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    cow_count: int | None = Field(default=None, ge=0)
    buffalo_count: int | None = Field(default=None, ge=0)
    daily_capacity_litres: float | None = Field(default=None, ge=0)


class ProfileOut(BaseModel):
    """Full farmer profile as returned by GET /api/v1/farmer/profile."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    phone: str
    email: str | None = None
    profile_photo_url: str | None = None
    farm_name: str | None = None
    address: str | None = None
    village: str | None = None
    city: str | None = None
    tehsil: str | None = None
    district: str | None = None
    cow_count: int = 0
    buffalo_count: int = 0
    daily_capacity_litres: float = 0.0
    verification_status: str = "INCOMPLETE"
    role: str = "farmer"
