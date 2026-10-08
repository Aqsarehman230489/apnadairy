# ApnaDairy — Farmer payment business logic (REAL apnadairy-web schema).
# READ-ONLY against the web project (teammates own it).
# Real columns: farmer_payouts(id, area_manager_id, farmer_id, amount,
#   litres, collections, method, reference, status, receipt_no,
#   farmer_note, created_at, answered_at).
#
# The caller is the current_farmer context tuple from app.core.deps:
#   (profile, farmer_profile|None, farmer_row|None)
# farmer_row is the web farmers row matched by profile_id; the web
# farmers.id inside it is what farmer_payouts.farmer_id points to.
# No linked farmer_row -> empty list (never a 500).
# Rules: list newest-first by created_at; 404 for unknown ids or ids
# that belong to another farmer (no existence leak).
# English-only.

import json

from fastapi import HTTPException

from app.db.supabase_client import first_row, get_web_client, table
from app.schemas.farmer.payment import PaymentDetailOut, PaymentOut


def _web_farmer_id(ctx) -> str | None:
    """Resolve the web farmers.id from the current_farmer context tuple.

    Returns None (no 500) when the farmer has no linked web farmers row,
    so the caller simply sees an empty payment history.
    """
    try:
        _profile, _farmer_profile, farmer_row = ctx
    except (TypeError, ValueError):
        return None
    if not farmer_row:
        return None
    return farmer_row.get("id")


def _to_out(row: dict) -> PaymentOut:
    """Convert a raw web farmer_payouts row to the API list shape."""
    return PaymentOut(
        id=row["id"],
        amount=float(row.get("amount") or 0),
        litres=float(row.get("litres") or 0),
        status=row.get("status") or "PENDING",
        receipt_no=row.get("receipt_no") or str(row["id"])[:8],
        method=row.get("method"),
        reference=row.get("reference"),
        created_at=row.get("created_at"),
    )


def _collections_count(row: dict) -> int:
    """Count the milk collections attached to a payout.

    The collections column may be a JSON list or plain text; anything
    else counts as zero.
    """
    value = row.get("collections")
    if value is None:
        return 0
    if isinstance(value, (list, tuple)):
        return len(value)
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except (json.JSONDecodeError, ValueError):
            return 0
        return len(parsed) if isinstance(parsed, (list, tuple)) else 0
    return 0


def get_payments(ctx) -> list[PaymentOut]:
    """List the farmer's payouts, newest first.

    Returns an empty list when the farmer has no linked web farmers row.
    """
    farmer_id = _web_farmer_id(ctx)
    if not farmer_id:
        return []
    res = (
        table(get_web_client(), "farmer_payouts")
        .select("*")
        .eq("farmer_id", farmer_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_to_out(r) for r in (res.data or [])]


def get_payment(ctx, payment_id: str) -> PaymentDetailOut:
    """Return one payout of the caller; 404 when unknown or not the caller's.

    The row is fetched by id alone and ownership is checked afterwards,
    so a payout belonging to another farmer also yields 404.
    """
    res = (
        table(get_web_client(), "farmer_payouts")
        .select("*")
        .eq("id", payment_id)
        .limit(1)
        .execute()
    )
    row = first_row(res)
    farmer_id = _web_farmer_id(ctx)
    if row is None or not farmer_id or row.get("farmer_id") != farmer_id:
        raise HTTPException(status_code=404, detail="Payment not found")
    out = _to_out(row)
    return PaymentDetailOut(
        **out.model_dump(),
        farmer_note=row.get("farmer_note"),
        collections_count=_collections_count(row),
    )
