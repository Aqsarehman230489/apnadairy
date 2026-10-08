# ApnaDairy — Notification request/response schemas (Pydantic v2).

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificationOut(BaseModel):
    """One notification shown in the farmer's inbox."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    message: str
    type: str
    deep_link: str | None
    read: bool
    created_at: datetime


class MarkReadIn(BaseModel):
    """Mark a batch of notifications as read (ids must be non-empty)."""

    ids: list[str] = Field(min_length=1)
