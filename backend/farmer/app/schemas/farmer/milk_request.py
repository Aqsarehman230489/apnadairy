"""ApnaDairy — Pydantic schemas for farmer milk requests.

MilkRequestCreate: what the mobile app sends on "Add New Milk".
MilkRequestOut:   what the API returns (includes server-set fields).
"""

from __future__ import annotations

import datetime

from pydantic import BaseModel, ConfigDict, Field


class MilkRequestCreate(BaseModel):
    """Payload for POST /api/v1/farmer/milk-requests (farmer_id comes from the auth token)."""

    litres: float = Field(ge=1, le=500, description="Milk quantity in litres (1-500).")
    manager_id: str = Field(min_length=1, description="Assigned manager the request goes to.")


class MilkRequestOut(BaseModel):
    """A milk request as stored/returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    farmer_id: str
    manager_id: str
    litres: float
    status: str  # SENT | VIEWED | TESTING | OFFERED | CLOSED
    created_at: datetime.datetime
