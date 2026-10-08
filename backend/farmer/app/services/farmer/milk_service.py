"""ApnaDairy — LEGACY v1 milk-request business logic (UNUSED).

Superseded by the v2 manager-driven sale flow (app/services/farmer/
sales_service.py). Kept for reference only — no router imports this module.


Rules enforced here (never in routers):
  * a farmer can only create/list/read his OWN requests (farmer_id always from the token)
  * a new request starts at status SENT

Data sources (single WEB Supabase project, farmer portal v2):
  * milk_requests table: portal milk requests (status starts at SENT).
  * milk_collections: the manager's recorded intakes, surfaced as COMPLETED
    history rows so the farmer sees his full supply record in one list.

A web collection maps to a MilkRequest-shaped dict:
  id <- collection id, manager_id <- area_manager_id,
  litres <- quantity_l, status <- "COMPLETED", created_at <- collected_at.
"""

from __future__ import annotations

import datetime
import uuid

from app.db.supabase_client import (
    MissingTableError,
    first_row,
    get_web_client,
    get_web_client,
    iso,
    table,
)


def _utcnow_iso() -> str:
    """Return current UTC time as ISO string."""
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _new_id(prefix: str) -> str:
    """Generate a readable id like MR-4F2A9C."""
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"


def create_request(farmer_id: str, litres: float, manager_id: str) -> dict:
    """Create a new milk request for the farmer (status starts at SENT).

    Written to the web project's milk_requests table.
    """
    record = {
        "id": _new_id("MR"),
        "farmer_id": farmer_id,  # from auth token — never from request body
        "manager_id": manager_id,
        "litres": litres,
        "status": "SENT",
        "created_at": _utcnow_iso(),
    }
    res = table(get_web_client(), "milk_requests").insert(record).execute()
    saved = first_row(res)
    return saved or record


def _portal_requests(farmer_id: str) -> list[dict]:
    """Return the farmer's portal milk_requests rows (web project)."""
    try:
        res = (
            table(get_web_client(), "milk_requests")
            .select("*")
            .eq("farmer_id", farmer_id)
            .execute()
        )
        return res.data or []
    except MissingTableError:
        return []


def _web_history(farmer_id: str) -> list[dict]:
    """Return the farmer's web collection intakes as COMPLETED history rows."""
    try:
        res = (
            table(get_web_client(), "milk_collections")
            .select("id, farmer_id, area_manager_id, quantity_l, collected_at")
            .eq("farmer_id", farmer_id)
            .execute()
        )
    except MissingTableError:
        return []
    out = []
    for r in res.data or []:
        out.append(
            {
                "id": r["id"],
                "farmer_id": r["farmer_id"],
                "manager_id": r.get("area_manager_id") or "",
                "litres": float(r.get("quantity_l") or 0),
                "status": "COMPLETED",  # web rows are finished intake records
                "created_at": r.get("collected_at"),
            }
        )
    return out


def get_requests(farmer_id: str) -> list[dict]:
    """List the farmer's requests: portal requests + web collection history, newest first."""
    recs = _portal_requests(farmer_id) + _web_history(farmer_id)
    # Newest first; ISO strings sort lexicographically.
    return sorted(recs, key=lambda r: iso(r.get("created_at")) or "", reverse=True)


def get_request(farmer_id: str, request_id: str) -> dict:
    """Return one request or history row; ValueError if missing or not owned."""
    rec = _find_portal_request(farmer_id, request_id)
    if rec is not None:
        return rec
    for r in _web_history(farmer_id):
        if r["id"] == request_id:
            return r
    raise ValueError("Milk request not found.")


def _find_portal_request(farmer_id: str, request_id: str) -> dict | None:
    """Return one portal request row, or None when missing/not owned."""
    try:
        res = (
            table(get_web_client(), "milk_requests")
            .select("*")
            .eq("id", request_id)
            .eq("farmer_id", farmer_id)
            .limit(1)
            .execute()
        )
    except MissingTableError:
        return None
    return first_row(res)


def get_request_timeline(farmer_id: str, request_id: str) -> list[dict]:
    """Return the status timeline derived from the request's current status."""
    record = get_request(farmer_id, request_id)  # ownership check first
    created = iso(record.get("created_at")) or ""
    if record.get("status") == "COMPLETED":
        # Web collection history: a single finished-intake event.
        return [
            {
                "status": "COMPLETED",
                "at": created,
                "note": "The manager has recorded the milk intake (testing complete).",
            }
        ]
    base = [
        {"status": "SENT", "at": created, "note": "The request has been sent to the manager."},
    ]
    if record.get("status") in ("VIEWED", "TESTING", "OFFERED", "CLOSED"):
        base.append({"status": "VIEWED", "at": created, "note": "The manager has viewed the request."})
    if record.get("status") in ("TESTING", "OFFERED", "CLOSED"):
        base.append({"status": "TESTING", "at": created, "note": "IoT testing is in progress."})
    if record.get("status") in ("OFFERED", "CLOSED"):
        base.append({"status": "OFFERED", "at": created, "note": "The offer has arrived — please accept or decline."})
    return base
