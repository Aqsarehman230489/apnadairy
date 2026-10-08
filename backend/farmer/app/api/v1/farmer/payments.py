# ApnaDairy — Farmer payments HTTP router.
# Thin layer: auth dependency -> service call -> validated response.
# Route order matters: /payments is registered before /payments/{id}.
# English-only.

from fastapi import APIRouter, Depends

from app.core.deps import current_farmer
from app.schemas.farmer.payment import PaymentDetailOut, PaymentOut
from app.services.farmer.payment_service import get_payment, get_payments

router = APIRouter(prefix="/api/v1/farmer", tags=["farmer-payments"])


@router.get("/payments", response_model=list[PaymentOut])
def read_payments(ctx=Depends(current_farmer)) -> list[PaymentOut]:
    """List the caller's payouts, newest first (empty when not linked)."""
    return get_payments(ctx)


@router.get("/payments/{payment_id}", response_model=PaymentDetailOut)
def read_payment(payment_id: str, ctx=Depends(current_farmer)) -> PaymentDetailOut:
    """Return one payout with the farmer note and collection count; 404 if unknown or not the caller's."""
    return get_payment(ctx, payment_id)
