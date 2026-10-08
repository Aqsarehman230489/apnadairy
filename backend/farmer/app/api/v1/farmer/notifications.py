# ApnaDairy — Farmer notifications HTTP router.
# Thin layer: auth dependency -> service call -> validated response.

from fastapi import APIRouter, Depends

from app.core.deps import current_farmer, require_profile_id
from app.schemas.farmer.notification import MarkReadIn, NotificationOut
from app.services.farmer.notification_service import get_notifications, mark_read

router = APIRouter(prefix="/api/v1/farmer", tags=["farmer-notifications"])


@router.get("/notifications", response_model=list[NotificationOut])
def read_notifications(
    ctx: tuple = Depends(current_farmer),
) -> list[NotificationOut]:
    """List the farmer's notifications, newest first."""
    return get_notifications(require_profile_id(ctx))


@router.post("/notifications/read")
def mark_notifications_read(
    payload: MarkReadIn, ctx: tuple = Depends(current_farmer)
) -> dict:
    """Mark a batch of notifications as read; returns the count marked."""
    return mark_read(require_profile_id(ctx), payload.ids)
