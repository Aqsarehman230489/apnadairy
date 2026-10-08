# ApnaDairy — LEGACY v1 verification state machine (UNUSED).
# Superseded: verification state now reads from the web farmer_profiles row
# (verified_at / rejection_reason) via app/api/v1/farmer/verification.py.
# Kept for reference only — no router imports this module.
# Portal verification STATE lives in the web project's farmer_verifications
# table (farmer_id TEXT PK, status TEXT, rejection_reason TEXT, updated_at).
# The apnadairy-web farmers table is READ-ONLY identity — never written here.
# Allowed transitions: INCOMPLETE -> SUBMITTED -> PENDING -> APPROVED,
# and REJECTED -> SUBMITTED (resubmit). Anything else raises ValueError (400).
# Reads tolerate a missing row (treated as INCOMPLETE).

from datetime import datetime, timezone

from app.db.supabase_client import first_row, get_web_client, iso, table
from app.schemas.farmer.verification import VerificationStatusOut

# --- Allowed next states per current state ---
_ALLOWED: dict[str, tuple[str, ...]] = {
    "INCOMPLETE": ("SUBMITTED",),
    "SUBMITTED": ("PENDING",),          # documents uploaded -> under review
    "PENDING": ("APPROVED", "REJECTED"),  # SuperAdmin decision (via web/admin)
    "REJECTED": ("SUBMITTED",),         # farmer resubmits
    "APPROVED": (),                     # terminal
}


def _now_iso() -> str:
    """Return current UTC time as ISO string."""
    return datetime.now(timezone.utc).isoformat()


def get_status(farmer_id: str) -> VerificationStatusOut:
    """Return the farmer's portal verification state (INCOMPLETE when no row)."""
    row = _fetch_row(farmer_id)
    status = (row.get("status") if row else None) or "INCOMPLETE"
    updated = iso(row.get("updated_at")) if row else None
    # The table tracks one timestamp; derive the two API fields from it.
    return VerificationStatusOut(
        status=status,
        submitted_at=updated if status != "INCOMPLETE" else None,
        reviewed_at=updated if status in ("APPROVED", "REJECTED") else None,
        rejection_reason=row.get("rejection_reason") if row else None,
    )


def submit_for_verification(farmer_id: str) -> VerificationStatusOut:
    """Move INCOMPLETE/REJECTED -> SUBMITTED (upsert); reject other transitions."""
    row = _fetch_row(farmer_id)
    current = (row.get("status") if row else None) or "INCOMPLETE"
    if "SUBMITTED" not in _ALLOWED.get(current, ()):
        raise ValueError(f"cannot submit for verification from state {current!r}")
    payload = {
        "farmer_id": farmer_id,
        "status": "SUBMITTED",
        "rejection_reason": None,
        "updated_at": _now_iso(),
    }
    client = get_web_client()
    if row is None:
        table(client, "farmer_verifications").insert(payload).execute()
    else:
        table(client, "farmer_verifications").update(payload).eq(
            "farmer_id", farmer_id
        ).execute()
    return get_status(farmer_id)


def mark_documents_submitted(farmer_id: str) -> None:
    """Move SUBMITTED -> PENDING once documents are uploaded (no-op otherwise).

    Called by the documents upload endpoint; keeps the state machine in one place.
    """
    row = _fetch_row(farmer_id)
    if row is not None and row.get("status") == "SUBMITTED":
        table(get_web_client(), "farmer_verifications").update(
            {"status": "PENDING", "updated_at": _now_iso()}
        ).eq("farmer_id", farmer_id).execute()


def _fetch_row(farmer_id: str) -> dict | None:
    """Return the farmer's verification row, or None when none exists yet."""
    res = (
        table(get_web_client(), "farmer_verifications")
        .select("farmer_id,status,rejection_reason,updated_at")
        .eq("farmer_id", farmer_id)
        .limit(1)
        .execute()
    )
    return first_row(res)
