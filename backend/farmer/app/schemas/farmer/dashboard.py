# ApnaDairy — Pydantic v2 schemas for the farmer home stats response.
# This defines the exact JSON shape the mobile app consumes.
# Kept deliberately flat and simple: big numbers for the Home tab cards.

from pydantic import BaseModel, Field


class RegisteredManager(BaseModel):
    """The area manager the farmer is registered with (buys his milk)."""

    center_name: str = Field(..., description="Name of the manager's dairy center.")
    city: str = Field(default="", description="City of the dairy center.")
    manager_name: str = Field(default="", description="Manager's full name (from profiles).")
    phone: str = Field(default="", description="Manager's phone (from profiles).")


class FarmerStatsResponse(BaseModel):
    """Flat payload for GET /api/v1/farmer/stats.

    Every litre and rupee counts only ACCEPTED milk collections
    (status='accepted' in the web milk_collections table).
    """

    total_milk_l: float = Field(..., description="Total milk supplied in litres, all time.")
    today_milk_l: float = Field(
        ..., description="Milk supplied today (Asia/Karachi), in litres."
    )
    total_revenue: float = Field(
        ..., description="Total revenue earned in PKR, all time."
    )
    money_earned: float = Field(
        ...,
        description=(
            "Money earned in PKR. Equals total_revenue until payouts split it; "
            "kept as its own field so the UI can show an earnings card."
        ),
    )
    registered_manager: RegisteredManager | None = Field(
        default=None,
        description="Registered area manager, null when the farmer has none yet.",
    )
    total_sales: int = Field(..., description="Number of accepted milk sales.")
