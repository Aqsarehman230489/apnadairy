"""ApnaDairy — Pydantic schemas for farmer offers.

OfferOut:      full offer as returned by the API (test readings + AI recommendation).
OfferDecision: farmer's accept/refuse payload for POST /offers/{id}/decision.
"""

from __future__ import annotations

import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class OfferOut(BaseModel):
    """A manager's offer on a milk request."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    request_id: str
    farmer_id: str
    manager_id: str
    litres: float
    temperature: Optional[float] = None  # IoT readings (demonstration values in dev)
    ph: Optional[float] = None
    tds: Optional[float] = None
    ec: Optional[float] = None
    ai_score: Optional[float] = None  # AI freshness score (demonstration in dev)
    ai_category: Optional[str] = None  # A | B | C
    price_per_litre: float
    total_amount: float
    status: str  # PENDING | ACCEPTED | REFUSED | EXPIRED | PURCHASE_PENDING
    expires_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime


class OfferDecision(BaseModel):
    """Farmer's decision on a PENDING offer."""

    decision: Literal["accept", "refuse"] = Field(description="'accept' or 'refuse'.")
    reason: Optional[str] = Field(
        default=None, max_length=500, description="Optional note, e.g. why refused."
    )
