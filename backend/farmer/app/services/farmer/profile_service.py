# ApnaDairy — business logic for farmer profile read/update (REAL Supabase).
# Identity lives in the web project's farmers table (READ-ONLY here — the
# registry row is created by the onboarding/accept flows, never edited here).
# Portal profile EDITS (name/phone/village/farm_name) live in the web
# project's farmer_profiles table keyed by user_id = profiles.id (same key
# the onboarding flow writes); get_profile merges the override over the web
# farmers row.
# Real web columns: farmers(id, area_manager_id, profile_id, full_name,
# phone, village, milk_type, cattle_count, is_active, created_at).
# Mapping notes: name <- full_name; cow_count <- cattle_count (GUESS: the web
# schema does not split cows/buffaloes); verification_status is derived from
# is_active.
# Every query is filtered by the token's farmer_id — a farmer can only ever
# read or update their OWN row.

from app.db.supabase_client import first_row, get_web_client, table
from app.schemas.farmer.profile import FarmUpdate, PersonalUpdate, ProfileOut

# API field -> farmer_profiles column (portal-side override row).
_PERSONAL_FIELDS = {"name": "full_name", "phone": "phone"}
_FARM_FIELDS = {"village": "village", "farm_name": "farm_name"}


def get_profile(farmer_id: str) -> ProfileOut:
    """Return the farmer's own profile (KeyError when no row exists).

    Web farmers row is the base; any farmer_profiles override row (keyed by
    user_id = profiles.id) overrides name/phone/village/farm_name.
    """
    res = (
        table(get_web_client(), "farmers")
        .select("*")
        .eq("id", farmer_id)
        .limit(1)
        .execute()
    )
    row = first_row(res)
    if row is None:
        raise KeyError(f"unknown farmer: {farmer_id}")
    override = _get_override(row["profile_id"]) if row.get("profile_id") else None
    if override:
        row = {**row, **{k: v for k, v in override.items() if v is not None}}
    return _to_out(row)


def update_personal(farmer_id: str, data: PersonalUpdate) -> ProfileOut:
    """Apply a partial personal update (name/phone) to the farmer's own profile.

    Stored in the web project's farmer_profiles override row (upsert, keyed
    by user_id = profiles.id) — the web farmers registry row is never
    written to here.
    """
    _require_profile(farmer_id)
    patch = {
        _PERSONAL_FIELDS[k]: v
        for k, v in data.model_dump(exclude_none=True).items()
        if k in _PERSONAL_FIELDS
    }
    _upsert_override(_profile_user_id(farmer_id), patch)
    return get_profile(farmer_id)


def update_farm(farmer_id: str, data: FarmUpdate) -> ProfileOut:
    """Apply a partial farm update (village/farm_name) to the farmer's profile.

    Stored in the web project's farmer_profiles override row (upsert, keyed
    by user_id = profiles.id) — the web farmers registry row is never
    written to here.
    """
    _require_profile(farmer_id)
    patch = {
        _FARM_FIELDS[k]: v
        for k, v in data.model_dump(exclude_none=True).items()
        if k in _FARM_FIELDS
    }
    _upsert_override(_profile_user_id(farmer_id), patch)
    return get_profile(farmer_id)


def _profile_user_id(farmer_id: str) -> str:
    """Return the profiles.id for a web farmers.id (KeyError when unknown).

    The farmer_profiles override row is keyed by user_id = profiles.id (the
    same key the onboarding flow writes), so the web farmers row's
    profile_id is resolved first.
    """
    res = (
        table(get_web_client(), "farmers")
        .select("profile_id")
        .eq("id", farmer_id)
        .limit(1)
        .execute()
    )
    row = first_row(res)
    if row is None or not row.get("profile_id"):
        raise KeyError(f"unknown farmer: {farmer_id}")
    return row["profile_id"]


def _get_override(user_id: str) -> dict | None:
    """Return the portal-side profile override row, or None."""
    res = (
        table(get_web_client(), "farmer_profiles")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return first_row(res)


def _upsert_override(user_id: str, patch: dict) -> None:
    """Insert or update the farmer's portal-side profile row (web project)."""
    if not patch:
        return
    res = (
        table(get_web_client(), "farmer_profiles")
        .select("user_id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if first_row(res):
        table(get_web_client(), "farmer_profiles").update(patch).eq(
            "user_id", user_id
        ).execute()
    else:
        table(get_web_client(), "farmer_profiles").insert(
            {"user_id": user_id, **patch}
        ).execute()


def _require_profile(farmer_id: str) -> dict:
    """Return the profile row or raise KeyError (router maps it to 404)."""
    res = (
        table(get_web_client(), "farmers")
        .select("id")
        .eq("id", farmer_id)
        .limit(1)
        .execute()
    )
    row = first_row(res)
    if row is None:
        raise KeyError(f"unknown farmer: {farmer_id}")
    return row


def _to_out(row: dict) -> ProfileOut:
    """Convert a merged (web + override) row to the API shape."""
    return ProfileOut(
        id=row["id"],
        name=row.get("full_name") or "",
        phone=row.get("phone") or "",
        email=None,  # no email column on web farmers
        profile_photo_url=None,  # no photo column on web farmers
        farm_name=row.get("farm_name"),  # portal-side override only
        address=None,  # no address column on web farmers
        village=row.get("village"),
        city=None,  # no city column on web farmers
        tehsil=None,  # no tehsil column on web farmers
        district=None,  # no district column on web farmers
        cow_count=int(row.get("cattle_count") or 0),  # GUESS: web has no cow/buffalo split
        buffalo_count=0,  # GUESS: web has no cow/buffalo split
        daily_capacity_litres=0.0,  # no capacity column on web farmers
        verification_status="APPROVED" if row.get("is_active") else "PENDING",
        role="farmer",
    )
