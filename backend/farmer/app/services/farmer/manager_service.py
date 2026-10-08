# ApnaDairy — v2 MANAGER side of farmer<->manager linking (REAL web schema).
# The area manager reviews pending registration requests for their OWN
# center and accepts / declines / ends them. Every action is scoped to the
# caller's center: a request belonging to another center is invisible (404).
# Accepting links the farmer exclusively to this center by setting
# farmers.area_manager_id; ending the linkage clears it again.
# Web tables used (write path — v2: web is primary read+write for linking):
#   farmer_requests(farmer_id -> profiles.id, area_manager_id, status, ...)
#   farmers(id, profile_id -> profiles.id, area_manager_id)
#   profiles(id, full_name, phone)
#   farmer_profiles(user_id -> profiles.id, city, cattle_count, daily_litres)

import datetime
import logging

from app.db.supabase_client import first_row, get_web_client, iso, table
from app.schemas.farmer.linking import (
    LinkActionOut,
    PendingRequestOut,
    RequestFarmerOut,
)

logger = logging.getLogger(__name__)


class RequestNotFoundError(KeyError):
    """No such request for this manager's center (router maps to 404)."""


class RequestStateError(ValueError):
    """The request is not in the status the action needs (router maps to 409)."""


def _now_iso() -> str:
    """Current UTC time as an ISO string (timestamptz-compatible)."""
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _owned_request(web, manager_id: str, request_id: str) -> dict:
    """Return the request row when it belongs to the manager's center.

    Raises RequestNotFoundError when the id is unknown OR belongs to
    another center (never leaks other centers' requests).
    """
    row = first_row(
        table(web, "farmer_requests")
        .select("*")
        .eq("id", request_id)
        .eq("area_manager_id", manager_id)
        .limit(1)
        .execute()
    )
    if row is None:
        raise RequestNotFoundError(f"unknown request: {request_id}")
    return row


def _farmer_detail(web, farmer_profile_id: str) -> RequestFarmerOut:
    """Build the farmer info block for one requester (profiles + web
    farmer_profiles, joined on profiles.id)."""
    person = (
        first_row(
            table(web, "profiles")
            .select("id,full_name,phone")
            .eq("id", farmer_profile_id)
            .limit(1)
            .execute()
        )
        or {}
    )
    fp = (
        first_row(
            table(web, "farmer_profiles")
            .select("*")
            .eq("user_id", farmer_profile_id)
            .limit(1)
            .execute()
        )
        or {}
    )
    cattle = fp.get("cattle_count")
    if cattle is None:
        cattle = (fp.get("cow_count") or 0) + (fp.get("buffalo_count") or 0) or None
    litres = fp.get("daily_litres")
    if litres is None:
        litres = fp.get("daily_capacity_litres")
    return RequestFarmerOut(
        id=farmer_profile_id,
        full_name=person.get("full_name") or "Farmer",
        phone=person.get("phone") or "—",
        city=fp.get("city"),
        cattle_count=cattle,
        daily_litres=litres,
    )


def list_pending_requests(manager_id: str) -> list[PendingRequestOut]:
    """Return pending registration requests for the manager's center."""
    web = get_web_client()
    reqs = (
        table(web, "farmer_requests")
        .select("id,farmer_id,area_manager_id,note,status,created_at")
        .eq("area_manager_id", manager_id)
        .eq("status", "pending")
        .order("created_at")
        .execute()
        .data
        or []
    )
    return [
        PendingRequestOut(
            id=r["id"],
            status=r.get("status") or "pending",
            note=r.get("note"),
            created_at=iso(r.get("created_at")),
            farmer=_farmer_detail(web, r["farmer_id"]),
        )
        for r in reqs
    ]


def _link_farmers_row(
    web, farmer_profile_id: str, manager_id: str | None, only_if: str | None = None
) -> bool:
    """Set (or clear, when manager_id is None) farmers.area_manager_id.

    Finds the web farmers row by profile_id. When clearing, the update is
    skipped unless the row still points at `only_if` (never break a newer
    linkage). Returns True when a row was updated, False when no farmers
    row exists yet (accept still succeeds; the request row is the source
    of truth).
    """
    farmer_row = first_row(
        table(web, "farmers")
        .select("id,area_manager_id")
        .eq("profile_id", farmer_profile_id)
        .limit(1)
        .execute()
    )
    if farmer_row is None:
        logger.warning(
            "linking: no web farmers row for profile %s; area_manager_id not set",
            farmer_profile_id,
        )
        return False
    if manager_id is None:
        if only_if is not None and farmer_row.get("area_manager_id") != only_if:
            return False
    table(web, "farmers").update({"area_manager_id": manager_id}).eq(
        "id", farmer_row["id"]
    ).execute()
    return True


def accept_request(manager_id: str, request_id: str) -> LinkActionOut:
    """Accept a pending request: status -> accepted; farmer linked
    exclusively to this center via farmers.area_manager_id."""
    web = get_web_client()
    req = _owned_request(web, manager_id, request_id)
    if req.get("status") != "pending":
        raise RequestStateError(
            f"Request is {req.get('status')}; only pending requests can be accepted."
        )
    table(web, "farmer_requests").update(
        {"status": "accepted", "answered_at": _now_iso()}
    ).eq("id", request_id).execute()
    linked = _link_farmers_row(web, req["farmer_id"], manager_id)
    return LinkActionOut(
        id=request_id,
        status="accepted",
        farmer_id=req["farmer_id"],
        area_manager_id=manager_id,
        farmer_row_linked=linked,
    )


def decline_request(
    manager_id: str, request_id: str, reason: str | None
) -> LinkActionOut:
    """Decline a pending request: status -> rejected (+ optional reason)."""
    web = get_web_client()
    req = _owned_request(web, manager_id, request_id)
    if req.get("status") != "pending":
        raise RequestStateError(
            f"Request is {req.get('status')}; only pending requests can be declined."
        )
    table(web, "farmer_requests").update(
        {
            "status": "rejected",
            "reason": (reason or "").strip() or None,
            "answered_at": _now_iso(),
        }
    ).eq("id", request_id).execute()
    return LinkActionOut(
        id=request_id,
        status="rejected",
        farmer_id=req["farmer_id"],
        area_manager_id=manager_id,
        farmer_row_linked=False,
    )


def end_linkage(manager_id: str, request_id: str) -> LinkActionOut:
    """End an accepted linkage: status -> ended; farmers.area_manager_id
    cleared (only when it still points at this center)."""
    web = get_web_client()
    req = _owned_request(web, manager_id, request_id)
    if req.get("status") != "accepted":
        raise RequestStateError(
            f"Request is {req.get('status')}; only an accepted linkage can be ended."
        )
    table(web, "farmer_requests").update(
        {"status": "ended", "ended_at": _now_iso()}
    ).eq("id", request_id).execute()
    cleared = _link_farmers_row(web, req["farmer_id"], None, only_if=manager_id)
    return LinkActionOut(
        id=request_id,
        status="ended",
        farmer_id=req["farmer_id"],
        area_manager_id=manager_id,
        farmer_row_linked=cleared,
    )
