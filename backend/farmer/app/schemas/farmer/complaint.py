# ApnaDairy — Complaint request/response schemas (Pydantic v2).
# Message minimum length keeps one-line tickets out of the admin queue.

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ComplaintCreate(BaseModel):
    """Payload for filing a new complaint from the farmer app."""

    category: str = Field(min_length=2, max_length=32)
    message: str = Field(min_length=10, max_length=2000)
    photo_url: str | None = Field(default=None, max_length=512)


class ComplaintOut(BaseModel):
    """A complaint with its current status and any admin reply."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    category: str
    message: str
    photo_url: str | None
    status: str
    admin_reply: str | None
    created_at: datetime
