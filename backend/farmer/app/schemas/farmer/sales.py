"""ApnaDairy — Pydantic schemas for the manager-driven daily sale flow.

SaleStartRequest:   manager starts a sale for a linked farmer.
IoTResultRequest:   manager posts IoT device readings for a sale.
IoTResultResponse:  computed freshness score + AI price for display.
OfferSummary:       the offer both parties see (idempotent re-read).
AcceptResponse:     farmer's acceptance receipt.
RefuseRequest/Response: farmer's refusal.
SaleListItem:       one sale in the farmer/manager sales history.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SaleStartRequest(BaseModel):
    """Manager starts a daily sale: which farmer (farmers.id) and how much."""

    farmer_id: str = Field(description="Web farmers.id of the selling farmer.")
    quantity_l: float = Field(
        gt=0, le=10000, description="Milk quantity in litres (must be positive)."
    )


class SaleStartResponse(BaseModel):
    """Created sale identifier."""

    sale_id: str


class IoTResultRequest(BaseModel):
    """IoT device test readings for one sale."""

    temperature_c: float = Field(description="Milk temperature in Celsius.")
    ph: float = Field(ge=0, le=14, description="Milk pH (0-14).")
    tds_ppm: float = Field(ge=0, description="Total dissolved solids in ppm.")
    ec_ms: float = Field(ge=0, description="Electrical conductivity in mS/cm.")


class IoTResultResponse(BaseModel):
    """Freshness score + AI price computed from the IoT readings."""

    freshness_score: float
    discount_pct: float
    price_per_l: float
    total_amount: float


class OfferSummary(BaseModel):
    """The offer as shown to the manager and the farmer."""

    sale_id: str
    farmer_id: str
    farmer_name: Optional[str] = None
    center_name: Optional[str] = None
    quantity_l: float
    price_per_l: float
    total_amount: float
    freshness_score: Optional[float] = None
    discount_pct: float
    status: str
    collected_at: Optional[str] = None


class AcceptResponse(BaseModel):
    """Farmer accepted: receipt number and final amount."""

    receipt_no: str
    total_amount: float


class RefuseRequest(BaseModel):
    """Farmer refuses the offer; reason is optional."""

    reason: Optional[str] = Field(
        default=None, max_length=500, description="Optional note, e.g. price too low."
    )


class RefuseResponse(BaseModel):
    """Confirmation of the refusal."""

    sale_id: str
    status: str


class SaleListItem(BaseModel):
    """One sale in the sales history list."""

    id: str
    quantity_l: float
    price_per_l: Optional[float] = None
    total_amount: Optional[float] = None
    freshness_score: Optional[float] = None
    status: str
    decided_at: Optional[str] = None
    collected_at: Optional[str] = None
    receipt_no: Optional[str] = None
    farmer_name: Optional[str] = None
    manager_name: Optional[str] = None
