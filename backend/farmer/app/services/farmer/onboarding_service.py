# ApnaDairy — business logic for farmer onboarding (WEB Supabase project).
# Upserts the caller's farmer_profiles row (keyed by user_id = profiles.id)
# and guarantees a matching farmers registry row exists for that profile.
# The web project is the primary read+write database for the farmer portal v2.

from datetime import datetime, timezone

from app.core.deps import table
from app.db.supabase_client import first_row
from app.schemas.farmer.onboarding import OnboardingIn


def _now_iso() -> str:
    """Return current UTC time as an ISO string."""
    return datetime.now(timezone.utc).isoformat()


def save_onboarding(
    profile: dict,
    farmer_profile: dict | None,
    data: OnboardingIn,
) -> dict:
    """Upsert the caller's farmer_profiles row and ensure a farmers row exists.

    profile is the caller's web profiles row (provides id/full_name/phone);
    farmer_profile is the existing farmer_profiles row or None. Returns the
    saved farmer_profiles row. Raises ValueError when the profile has no id.
    """
    user_id = (profile or {}).get("id")
    if not user_id:
        raise ValueError("Caller profile has no id.")

    payload = {
        "user_id": user_id,
        "city": data.city,
        "village": data.village,
        "address": data.address,
        "farm_name": data.farm_name,
        "milk_type": data.milk_type,
        "cattle_count": data.cattle_count,
        "daily_litres": data.daily_litres,
        "notes": data.notes,
        "submitted_at": _now_iso(),
    }
    # Upsert: update the existing row, insert when the farmer onboarded
    # for the first time. Fields not in the payload (photo_path, verified_at,
    # verified_by, rejection_reason) are preserved on update.
    if farmer_profile is None:
        table("farmer_profiles").insert(payload).execute()
    else:
        table("farmer_profiles").update(payload).eq("user_id", user_id).execute()

    _ensure_farmers_row(profile, data)
    return get_profile(user_id)


def get_profile(user_id: str) -> dict:
    """Return the farmer_profiles row for a profiles.id (KeyError when absent)."""
    row = first_row(
        table("farmer_profiles").select("*").eq("user_id", user_id).limit(1).execute()
    )
    if row is None:
        raise KeyError(f"No farmer_profiles row for user {user_id}.")
    return row


def _ensure_farmers_row(profile: dict, data: OnboardingIn) -> None:
    """Insert a web farmers registry row for this profile when none exists.

    The farmers row links the portal identity to the operational registry the
    manager flow works with. Only identity columns are set here; the manager
    assignment and verification happen elsewhere (manager accept / SuperAdmin).
    """
    user_id = profile.get("id")
    existing = first_row(
        table("farmers").select("id").eq("profile_id", user_id).limit(1).execute()
    )
    if existing is not None:
        return
    table("farmers").insert(
        {
            "profile_id": user_id,
            "full_name": profile.get("full_name"),
            "phone": profile.get("phone"),
            "village": data.village,
            "milk_type": data.milk_type,
            "cattle_count": data.cattle_count,
        }
    ).execute()
