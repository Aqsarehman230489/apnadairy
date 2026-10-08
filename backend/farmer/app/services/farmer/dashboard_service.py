# ApnaDairy — Farmer home stats business logic (REAL apnadairy-web schema).
# READ-ONLY against the web project (teammates own it).
# Real columns used:
#   farmers(id, profile_id, area_manager_id)
#   milk_collections(farmer_id, quantity_l, total_amount, status, collected_at)
#   farmer_requests(farmer_id, area_manager_id, status, created_at)
#   area_managers(id, center_name, city)
# Notes:
#   * milk_collections.farmer_id points at farmers.id (the web farmers row),
#     while farmer_requests.farmer_id points at profiles.id, so the manager
#     lookup joins through the web farmers row's profile_id.
#   * money_earned equals total_revenue until payouts split the two apart;
#     the field is kept so the mobile UI can show an earnings card.
#   * The farmer's identity NEVER comes from a client-sent id: it is the
#     farmer_row resolved from the auth token by the current_farmer
#     dependency. When the token owner has no web farmers row yet, all
#     numbers are 0 and the manager is null (no 500).

import datetime
from zoneinfo import ZoneInfo

from app.db.supabase_client import MissingTableError, first_row, get_web_client, table
from app.schemas.farmer.dashboard import FarmerStatsResponse, RegisteredManager

_PKT = ZoneInfo("Asia/Karachi")


def _today_karachi() -> datetime.date:
    """Return today's date in Asia/Karachi."""
    return datetime.datetime.now(_PKT).date()


def _to_karachi_date(value) -> datetime.date | None:
    """Parse a collected_at timestamp and return its date in Asia/Karachi.

    Supabase timestamptz values come back with an offset; naive values are
    treated as UTC (the web project's timestamps are stored in UTC).
    """
    if value is None:
        return None
    if isinstance(value, datetime.datetime):
        ts = value
    else:
        try:
            ts = datetime.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except (TypeError, ValueError):
            return None
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=datetime.timezone.utc)
    return ts.astimezone(_PKT).date()


def get_farmer_stats(farmer_row: dict | None) -> FarmerStatsResponse:
    """Build the farmer home stats payload.

    farmer_row is the web-project farmers row resolved from the auth
    token (see app/core/deps.py). When it is None the farmer simply has no
    recorded sales yet: zeros and null manager, no error.
    """
    if not farmer_row or not farmer_row.get("id"):
        return _empty_stats()
    farmer_id = farmer_row["id"]
    client = get_web_client()
    collections = _accepted_collections(client, farmer_id)
    today = _today_karachi()
    total_milk_l = sum(float(r.get("quantity_l") or 0) for r in collections)
    today_milk_l = sum(
        float(r.get("quantity_l") or 0)
        for r in collections
        if _to_karachi_date(r.get("collected_at")) == today
    )
    total_revenue = sum(float(r.get("total_amount") or 0) for r in collections)
    # money_earned equals revenue until payouts split the two apart; the
    # field is kept so the UI can show an earnings card.
    return FarmerStatsResponse(
        total_milk_l=total_milk_l,
        today_milk_l=today_milk_l,
        total_revenue=total_revenue,
        money_earned=total_revenue,
        registered_manager=_resolve_manager(client, farmer_row),
        total_sales=len(collections),
    )


def _empty_stats() -> FarmerStatsResponse:
    """Stats for a farmer with no web-project farmers row yet: zeros + null."""
    return FarmerStatsResponse(
        total_milk_l=0.0,
        today_milk_l=0.0,
        total_revenue=0.0,
        money_earned=0.0,
        registered_manager=None,
        total_sales=0,
    )


def _accepted_collections(client, farmer_id: str) -> list[dict]:
    """Return this farmer's accepted milk collections (missing table -> empty)."""
    try:
        res = (
            table(client, "milk_collections")
            .select("quantity_l, total_amount, collected_at")
            .eq("farmer_id", farmer_id)
            .eq("status", "accepted")
            .execute()
        )
    except MissingTableError:
        return []
    return res.data or []


def _resolve_manager(client, farmer_row: dict) -> RegisteredManager | None:
    """Return the farmer's registered area manager, or None.

    Primary path: the farmer's latest accepted farmer_requests row
    (farmer_requests.farmer_id points at profiles.id, taken from the web
    farmers row). Fallback: the farmers row's own area_manager_id.
    """
    manager_id = _accepted_request_manager_id(client, farmer_row)
    if not manager_id:
        manager_id = farmer_row.get("area_manager_id")
    if not manager_id:
        return None
    try:
        res = (
            table(client, "area_managers")
            .select("id, user_id, center_name, city")
            .eq("id", manager_id)
            .limit(1)
            .execute()
        )
    except MissingTableError:
        return None
    row = first_row(res)
    if row is None:
        return None
    # Manager name/phone live on profiles (area_managers.user_id) — same
    # pattern as the linking service.
    person: dict = {}
    if row.get("user_id"):
        try:
            prow = (
                table(client, "profiles")
                .select("id,full_name,phone")
                .eq("id", row["user_id"])
                .limit(1)
                .execute()
            )
            person = first_row(prow) or {}
        except MissingTableError:
            person = {}
    return RegisteredManager(
        center_name=row.get("center_name") or "",
        city=row.get("city") or "",
        manager_name=person.get("full_name") or row.get("center_name") or "Manager",
        phone=person.get("phone") or "—",
    )


def _accepted_request_manager_id(client, farmer_row: dict) -> str | None:
    """Return the area_manager_id from the farmer's accepted request, or None.

    The newest accepted row wins. A missing farmer_requests table is not
    fatal: the caller falls back to farmers.area_manager_id.
    """
    profiles_id = farmer_row.get("profile_id")
    if not profiles_id:
        return None
    try:
        res = (
            table(client, "farmer_requests")
            .select("area_manager_id, created_at")
            .eq("farmer_id", profiles_id)
            .eq("status", "accepted")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
    except MissingTableError:
        return None
    row = first_row(res)
    if row is None:
        return None
    return row.get("area_manager_id")
