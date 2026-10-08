# ApnaDairy — Shared FastAPI dependencies (farmer portal v2).
# Auth = web Supabase project JWT validated server-side; JWT sub = web
# profiles.id. Cross-worker contract (EXACT names, other workers depend on
# them):
#   current_profile -> web `profiles` row for JWT sub (401 if invalid/missing)
#   current_farmer  -> tuple (profile, farmer_profile|None, farmer_row|None)
#                      (403 unless profile.role == 'farmer')
#   current_manager -> tuple (profile, area_manager row)
#                      (403 unless an area_managers row has user_id = profiles.id)
#   get_market_price -> float(os.environ.get("MARKET_MILK_PRICE_PER_L", "220"))
# Legacy get_current_farmer is kept (existing routers still depend on it)
# but now resolves through the WEB project. Demo fallback is explicit
# opt-in ONLY: AUTH_DEMO_ENABLED defaults to "false" — the demo fallback is
# IMPOSSIBLE in production unless explicitly enabled for local dev.

import logging
import os

from fastapi import Depends, Header, HTTPException  # noqa: F401  (Depends re-exported for router convenience)

from app.core.security import validate_supabase_jwt
from app.db.supabase_client import (
    first_row,
    get_mobile_client,  # noqa: F401  (kept import-safe; decommissioned for farmer flows)
    get_web_client,
    table,  # noqa: F401  (re-exported: web-bound table(name) helper, used by routers)
    table_on,  # noqa: F401  (re-exported for explicit-client queries)
)

logger = logging.getLogger(__name__)


def demo_auth_enabled() -> bool:
    """True only when AUTH_DEMO_ENABLED is explicitly "true" (local dev).

    Default is False: demo fallback is impossible in production.
    """
    return os.environ.get("AUTH_DEMO_ENABLED", "false").lower() == "true"


def _demo_farmer_id() -> str:
    """The farmer every demo session acts as (real UUID from .env)."""
    return os.environ.get("DEMO_FARMER_ID", "farmer-001")


def get_market_price() -> float:
    """Current market milk price per litre in Rs.

    Configured via MARKET_MILK_PRICE_PER_L; defaults to 220.
    """
    return float(os.environ.get("MARKET_MILK_PRICE_PER_L", "220"))


def _bearer_claims(authorization: str | None) -> dict:
    """Validate the Authorization Bearer token and return its claims.

    Raises 401 for a missing or invalid token. The token's sub is the web
    profiles.id of the caller.
    """
    token: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip() or None
    if not token:
        raise HTTPException(
            status_code=401, detail="Login required (no token)."
        )
    try:
        claims = validate_supabase_jwt(token)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=401, detail="Login required (invalid token)."
        ) from None
    if not claims.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid login token.")
    return claims


def get_profile_by_id(profile_id: str) -> dict | None:
    """Return the web `profiles` row for a JWT sub (profiles.id), or None."""
    res = (
        table_on(get_web_client(), "profiles")
        .select("*")
        .eq("id", profile_id)
        .limit(1)
        .execute()
    )
    return first_row(res)


def current_profile(
    authorization: str | None = Header(None),
) -> dict:
    """Web `profiles` row for the caller's JWT sub.

    401 when the token is missing/invalid or when no profiles row matches
    the sub.
    """
    claims = _bearer_claims(authorization)
    profile = get_profile_by_id(claims["sub"])
    if profile is None:
        raise HTTPException(status_code=401, detail="Account not found.")
    return profile


def current_farmer(
    authorization: str | None = Header(None),
) -> tuple:
    """Tuple (profile, farmer_profile, farmer_row) for the caller.

    farmer_profile = web `farmer_profiles` row (user_id = profiles.id),
    None until the farmer submits verification. farmer_row = web `farmers`
    row (profile_id = profiles.id), None until an area manager accepts the
    farmer. 403 when the caller's profile role is not 'farmer'.

    Demo fallback: when no valid Bearer token is present AND
    AUTH_DEMO_ENABLED is explicitly "true" (local dev / tests only), the
    demo farmer (DEMO_FARMER_ID) is resolved from the web project. Default
    is 401 — the demo fallback is IMPOSSIBLE in production.
    """
    claims: dict | None = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip() or None
        if token:
            try:
                claims = validate_supabase_jwt(token)
            except HTTPException:
                claims = None  # invalid token -> demo fallback or 401 below

    if claims is None:
        if demo_auth_enabled():
            logger.warning(
                "Demo auth fallback used for current_farmer (no valid Bearer "
                "token) — set AUTH_DEMO_ENABLED=false in production."
            )
            return _demo_farmer_ctx()
        raise HTTPException(
            status_code=401, detail="Login required (no token)."
        )

    profile = get_profile_by_id(claims.get("sub") or "")
    if profile is None:
        raise HTTPException(status_code=401, detail="Account not found.")
    if profile.get("role") != "farmer":
        raise HTTPException(
            status_code=403, detail="Farmer access required."
        )
    return _farmer_ctx_for(profile)


def _demo_farmer_ctx() -> tuple:
    """Build the (profile, farmer_profile, farmer_row) tuple for the demo farmer.

    Resolves the DEMO_FARMER_ID web `farmers` row; the profile stub uses the
    row's profile_id (or the demo id itself when no row exists).
    """
    client = get_web_client()
    farmer_row = first_row(
        table_on(client, "farmers")
        .select("*")
        .eq("id", _demo_farmer_id())
        .limit(1)
        .execute()
    )
    profile_id = (farmer_row or {}).get("profile_id") or _demo_farmer_id()
    profile = {
        "id": profile_id,
        "role": "farmer",
        "full_name": (farmer_row or {}).get("full_name"),
        "phone": (farmer_row or {}).get("phone"),
    }
    return _farmer_ctx_for(profile, farmer_row=farmer_row)


def _farmer_ctx_for(profile: dict, farmer_row: dict | None = None) -> tuple:
    """Assemble the current_farmer tuple for a known web profiles row."""
    client = get_web_client()
    if farmer_row is None:
        farmer_row = first_row(
            table_on(client, "farmers")
            .select("*")
            .eq("profile_id", profile["id"])
            .limit(1)
            .execute()
        )
    farmer_profile = first_row(
        table_on(client, "farmer_profiles")
        .select("*")
        .eq("user_id", profile["id"])
        .limit(1)
        .execute()
    )
    return profile, farmer_profile, farmer_row


def require_profile_id(ctx: tuple) -> str:
    """Extract the web profiles.id (auth user id) from a current_farmer tuple.

    The shared web `notifications` table keys rows by user_id = profiles.id,
    so notification reads/writes use this, not the farmers.id.
    """
    profile = (ctx[0] if ctx else None) or {}
    profile_id = profile.get("id")
    if not profile_id:
        raise HTTPException(status_code=401, detail="Not signed in.")
    return profile_id


def require_web_farmer_id(ctx: tuple) -> str:
    """Extract the web `farmers.id` from a current_farmer tuple.

    404 when the caller has no web farmers row yet (manager has not accepted
    the registration, so there is no farmer-side record to read). Routers
    for portal tables keyed by farmers.id use this; the sales router has its
    own variant (403) because selling requires the link.
    """
    _profile, _farmer_profile, farmer_row = ctx
    farmer_id = (farmer_row or {}).get("id")
    if not farmer_id:
        raise HTTPException(
            status_code=404, detail="Farmer profile not found."
        )
    return farmer_id


def current_manager(
    authorization: str | None = Header(None),
) -> tuple:
    """Tuple (profile, area_manager row) for the caller.

    403 when no `area_managers` row has user_id = profiles.id.
    """
    profile = current_profile(authorization)
    manager = first_row(
        table_on(get_web_client(), "area_managers")
        .select("*")
        .eq("user_id", profile["id"])
        .limit(1)
        .execute()
    )
    if manager is None:
        raise HTTPException(
            status_code=403, detail="Area manager access required."
        )
    return profile, manager


def get_current_farmer(
    authorization: str | None = Header(None),
) -> str:
    """Legacy auth gate (kept: existing routers still depend on it).

    Resolves the caller through the WEB project: JWT sub -> profiles.id ->
    farmers.profile_id -> farmers.id. Before an area manager accepts the
    farmer there is no farmers row yet, so the profiles id (JWT sub) is
    returned as the stable identifier. Raises 401 for bad/missing tokens
    (demo disabled) and 403 when the auth user has no web profiles row.
    Demo fallback behavior is unchanged from before.
    """
    token: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip() or None

    if token:
        try:
            claims = validate_supabase_jwt(token)
        except Exception:
            claims = None  # invalid token -> demo fallback or 401 below
        if claims:
            sub = claims.get("sub")
            if not sub:
                raise HTTPException(
                    status_code=401, detail="Invalid login token."
                )
            profile = get_profile_by_id(sub)
            if profile is None:
                raise HTTPException(
                    status_code=403,
                    detail="Account not linked to a farmer profile yet.",
                )
            farmer_row = first_row(
                table_on(get_web_client(), "farmers")
                .select("id")
                .eq("profile_id", sub)
                .limit(1)
                .execute()
            )
            return farmer_row["id"] if farmer_row else sub

    if demo_auth_enabled():
        logger.warning(
            "Demo auth fallback used (no valid Bearer token) — "
            "set AUTH_DEMO_ENABLED=false in production."
        )
        return _demo_farmer_id()

    raise HTTPException(
        status_code=401, detail="Login required (invalid or missing token)."
    )
