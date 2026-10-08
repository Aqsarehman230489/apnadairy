"""ApnaDairy — LEGACY v1 offer business logic (UNUSED).

Superseded by the v2 manager-driven sale flow (app/services/farmer/
sales_service.py). Kept for reference only — no router imports this module.


Rules enforced here (never in routers):
  * farmer acts only on his OWN offers (farmer_id match; missing/wrong owner -> "not found")
  * accept/refuse allowed ONLY while status is PENDING
  * accept -> ACCEPTED (purchase is confirmed later by the MANAGER, not the farmer)
  * refuse -> REFUSED (stays in history, creates nothing)
  * a PENDING offer past its expires_at is treated as EXPIRED on every read
    (and persisted back to the table)

Table: offers.
"""

from __future__ import annotations

import datetime

from app.db.supabase_client import first_row, get_web_client, iso, table


def _utcnow() -> datetime.datetime:
    """Return current UTC time (timezone-aware)."""
    return datetime.datetime.now(datetime.timezone.utc)


def _parse_dt(value) -> datetime.datetime | None:
    """Parse an ISO datetime string to aware datetime; pass through datetimes."""
    if value is None or isinstance(value, datetime.datetime):
        return value
    return datetime.datetime.fromisoformat(value)


def _apply_expiry(client, offer: dict) -> dict:
    """Flip a PENDING offer to EXPIRED when past expires_at (persisted)."""
    if offer.get("status") == "PENDING":
        expires_at = _parse_dt(offer.get("expires_at"))
        if expires_at is not None and expires_at < _utcnow():
            table(client, "offers").update({"status": "EXPIRED"}).eq(
                "id", offer["id"]
            ).execute()
            offer["status"] = "EXPIRED"
    return offer


def get_offers(farmer_id: str) -> list[dict]:
    """List the farmer's own offers, newest first (expiry applied on read)."""
    client = get_web_client()
    res = (
        table(client, "offers")
        .select("*")
        .eq("farmer_id", farmer_id)
        .order("created_at", desc=True)
        .execute()
    )
    offers = [_apply_expiry(client, o) for o in (res.data or [])]
    # Newest first; ISO strings sort lexicographically.
    return sorted(offers, key=lambda o: iso(o.get("created_at")) or "", reverse=True)


def get_offer(farmer_id: str, offer_id: str) -> dict:
    """Return one offer; raises ValueError if missing or owned by someone else."""
    client = get_web_client()
    res = (
        table(client, "offers")
        .select("*")
        .eq("id", offer_id)
        .eq("farmer_id", farmer_id)
        .limit(1)
        .execute()
    )
    offer = first_row(res)
    if offer is None:
        raise ValueError("Offer not found.")
    return _apply_expiry(client, offer)


def decide_offer(
    farmer_id: str, offer_id: str, decision: str, reason: str | None = None
) -> dict:
    """Accept or refuse a PENDING offer; raises ValueError on any rule violation."""
    client = get_web_client()
    offer = get_offer(farmer_id, offer_id)  # ownership + expiry check first
    if offer.get("status") != "PENDING":
        raise ValueError(
            f"The offer can no longer be decided (status={offer.get('status')}). "
            "Only PENDING offers can be accepted or declined."
        )
    if decision == "accept":
        new_status = "ACCEPTED"  # the manager confirms the purchase (not the farmer)
    elif decision == "refuse":
        new_status = "REFUSED"  # stays in history; nothing is created
        # NOTE: `reason` is accepted but not persisted — the offers table has
        # no refuse_reason column. Add it via migration to store reasons.
    else:
        raise ValueError("Decision must be 'accept' or 'refuse'.")
    table(client, "offers").update({"status": new_status}).eq("id", offer_id).execute()
    offer["status"] = new_status
    return offer
