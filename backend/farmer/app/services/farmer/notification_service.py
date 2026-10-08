# ApnaDairy — Notification business logic (REAL Supabase).
# Table: notifications (shared WEB project table — columns user_id, title, body,
# kind, link, read_at, created_at; rows are keyed by profiles.id, the auth user).
# mark_read returns how many rows were marked.

from datetime import datetime, timezone

from app.db.supabase_client import get_web_client, table
from app.schemas.farmer.notification import NotificationOut


def _parse_dt(value) -> datetime:
    """Parse an ISO string to datetime; fall back to now when missing."""
    if value is None:
        return datetime.now(timezone.utc)
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value)


def _to_out(row: dict) -> NotificationOut:
    """Convert a raw web notifications row to the API shape."""
    return NotificationOut(
        id=row["id"],
        title=row.get("title") or "",
        message=row.get("body") or "",
        type=row.get("kind") or "info",
        deep_link=row.get("link"),
        read=row.get("read_at") is not None,
        created_at=_parse_dt(row.get("created_at")),
    )


def get_notifications(user_id: str) -> list[NotificationOut]:
    """List the user's notifications, newest first."""
    res = (
        table(get_web_client(), "notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_to_out(r) for r in (res.data or [])]


def mark_read(user_id: str, ids: list[str]) -> dict:
    """Mark the given notification ids as read; return the count newly marked.

    Read state is the read_at timestamp, so idempotency is computed from the
    current rows: only ids whose read_at is still null are updated and counted.
    """
    res = (
        table(get_web_client(), "notifications")
        .select("id,read_at")
        .eq("user_id", user_id)
        .in_("id", ids)
        .execute()
    )
    unread_ids = [r["id"] for r in (res.data or []) if r.get("read_at") is None]
    if unread_ids:
        table(get_web_client(), "notifications").update(
            {"read_at": datetime.now(timezone.utc).isoformat()}
        ).eq("user_id", user_id).in_("id", unread_ids).execute()
    return {"marked": len(unread_ids)}
