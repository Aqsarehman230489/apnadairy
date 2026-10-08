# ApnaDairy — Supabase client factory (service-role, server-side only).
# Farmer portal v2 (2026-10-08): the WEB Supabase project (apnadairy-web,
# https://aquatwwnpvnmirkqnhlp.supabase.co) is the SINGLE database for ALL
# farmer data: profiles, farmer_profiles, farmers, farmer_requests,
# area_managers, milk_collections, farmer_payouts.
# The mobile project ("ApnaDairy Mobile App") is NO LONGER used for farmer
# flows — get_mobile_client() is neutralized and raises, so stale callers
# fail loudly instead of hitting the wrong project. Credentials come from
# backend/.env as SUPABASE_WEB_URL / SUPABASE_WEB_SERVICE_KEY and are only
# ever read transiently via os.environ.
# The service_role key bypasses Row Level Security, so it MUST stay on the
# server: never commit .env, never paste the key in chat/docs, never ship
# it in the mobile app.

import functools
import os


class MissingTableError(RuntimeError):
    """Raised when a required Supabase table does not exist in the project."""

    def __init__(self, table_name: str):
        super().__init__(
            f"Supabase table '{table_name}' does not exist. "
            "Create it first in the web Supabase project, then retry."
        )
        self.table_name = table_name


def _require_env(name: str) -> str:
    """Return an env var's value, or raise RuntimeError naming the missing var."""
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"Missing env var {name}. Set it in backend/.env "
            "(Supabase dashboard -> Project Settings -> API)."
        )
    return value


def _build_client(url: str, key: str):
    """Create one supabase-py client (import deferred until actually needed)."""
    from supabase import create_client  # deferred: only needed when connecting

    return create_client(url, key)


_web_client = None  # cached WEB-project service-role client (one per process)


def get_web_client():
    """Build (once) and return the apnadairy-web service-role client.

    This is the primary client for ALL farmer data (profiles,
    farmer_profiles, farmers, farmer_requests, area_managers,
    milk_collections, farmer_payouts).
    """
    global _web_client
    if _web_client is None:
        _web_client = _build_client(
            _require_env("SUPABASE_WEB_URL"),
            _require_env("SUPABASE_WEB_SERVICE_KEY"),
        )
    return _web_client


def get_mobile_client():
    """DECOMMISSIONED for farmer flows (farmer portal v2).

    Kept import-safe only — all farmer data now lives in the WEB project
    (get_web_client()). Raises RuntimeError so stale callers fail loudly
    instead of silently hitting the wrong project.
    """
    raise RuntimeError(
        "get_mobile_client() is decommissioned: the mobile Supabase project "
        "is no longer used for farmer data. Use get_web_client() "
        "(the apnadairy-web project) instead."
    )


def reset_clients() -> None:
    """Drop the cached web client (used by tests to switch fake/real)."""
    global _web_client
    _web_client = None


def _is_missing_relation(exc: Exception) -> bool:
    """Detect PostgREST 'relation does not exist' errors (code 42P01)."""
    msg = str(exc).lower()
    return "42p01" in msg or ("relation" in msg and "does not exist" in msg)


class _QueryProxy:
    """Wrap a supabase-py query builder to translate missing-table errors.

    Chainable calls (select/eq/order/...) return new proxies; the terminal
    execute() converts a 42P01 into MissingTableError with a clear message.
    """

    def __init__(self, builder, table_name: str):
        self._builder = builder
        self._table_name = table_name

    def __getattr__(self, name):
        if name == "execute":
            return self._execute_safe
        attr = getattr(self._builder, name)
        if callable(attr):

            @functools.wraps(attr)
            def _chained(*args, **kwargs):
                return _QueryProxy(attr(*args, **kwargs), self._table_name)

            return _chained
        return attr

    def _execute_safe(self):
        """Run the query; raise MissingTableError when the table is absent."""
        try:
            return self._builder.execute()
        except Exception as exc:
            if _is_missing_relation(exc):
                raise MissingTableError(self._table_name) from exc
            raise


def table_on(client, table_name: str) -> _QueryProxy:
    """Missing-table-safe query builder for one table on the given client."""
    return _QueryProxy(client.table(table_name), table_name)


def table(first, second=None) -> _QueryProxy:
    """Query builder for a WEB-project table: table("farmers").

    Single-argument form is bound to the web client (farmer portal v2 —
    the contract other v2 workers use). The legacy two-argument positional
    form table(client, name) is still accepted during the v2 rewire but is
    deprecated; new code must call table(name).
    """
    if isinstance(first, str):
        client = second if second is not None else get_web_client()
        return table_on(client, first)
    # Legacy form: table(client, name).
    return table_on(first, second)


def first_row(result) -> dict | None:
    """Return the first row of an execute() result, or None when empty.

    Normalises supabase-py's list-shaped .data for single-row reads.
    """
    data = result.data
    if isinstance(data, list):
        return data[0] if data else None
    return data  # already a single dict (or None)


def iso(value) -> str | None:
    """Normalise a datetime or ISO string to an ISO string (None stays None)."""
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)
