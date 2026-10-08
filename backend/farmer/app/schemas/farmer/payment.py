# ApnaDairy — Payment request/response schemas (Pydantic v2).
# Shapes mirror the real web farmer_payouts columns
# (id, amount, litres, status, receipt_no, method, reference,
#  farmer_note, collections, created_at).
# Kept simple for a low-literacy UI: flat fields, no nested objects.
# English-only.

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PaymentOut(BaseModel):
    """One row in the farmer's payment history list (newest first)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    amount: float
    litres: float
    status: str
    receipt_no: str
    method: str | None
    reference: str | None
    created_at: datetime | None


class PaymentDetailOut(PaymentOut):
    """Full payout detail: base fields plus the farmer note and collection count."""

    model_config = ConfigDict(from_attributes=True)

    farmer_note: str | None
    collections_count: int
