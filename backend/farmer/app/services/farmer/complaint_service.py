# ApnaDairy — Complaint business logic (REAL Supabase).
# Table: complaints. Admin replies are written from the web portal;
# the farmer only files and reads their own tickets.

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException

from app.db.supabase_client import first_row, get_web_client, table
from app.schemas.farmer.complaint import ComplaintCreate, ComplaintOut


def _parse_dt(value) -> datetime:
    """Parse an ISO string to datetime; fall back to now when missing."""
    if value is None:
        return datetime.now(timezone.utc)
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value)


def _to_out(row: dict) -> ComplaintOut:
    """Convert a raw complaint row to the API shape."""
    return ComplaintOut(
        id=row["id"],
        category=row.get("category") or "",
        message=row.get("message") or "",
        photo_url=row.get("photo_url"),
        status=row.get("status") or "OPEN",
        admin_reply=row.get("admin_reply"),
        created_at=_parse_dt(row.get("created_at")),
    )


def get_complaints(farmer_id: str) -> list[ComplaintOut]:
    """List the farmer's complaints, newest first."""
    res = (
        table(get_web_client(), "complaints")
        .select("*")
        .eq("farmer_id", farmer_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_to_out(r) for r in (res.data or [])]


def create_complaint(farmer_id: str, data: ComplaintCreate) -> ComplaintOut:
    """File a new complaint; status starts OPEN with no admin reply."""
    row = {
        "id": f"CMP-{uuid.uuid4().hex[:6].upper()}",
        "farmer_id": farmer_id,
        "category": data.category,
        "message": data.message,
        "photo_url": data.photo_url,
        "status": "OPEN",
        "admin_reply": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = table(get_web_client(), "complaints").insert(row).execute()
    saved = first_row(res) or row
    return _to_out(saved)


def get_complaint(farmer_id: str, complaint_id: str) -> ComplaintOut:
    """Return one complaint with its admin reply; 404 if unknown."""
    res = (
        table(get_web_client(), "complaints")
        .select("*")
        .eq("id", complaint_id)
        .eq("farmer_id", farmer_id)
        .limit(1)
        .execute()
    )
    row = first_row(res)
    if row is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return _to_out(row)
