# ApnaDairy — Pydantic schemas for farmer verification flow.
# VerificationStatusOut powers the verification-status screen;
# DocumentOut powers the document list (status per uploaded document).

from pydantic import BaseModel, ConfigDict, Field


class VerificationStatusOut(BaseModel):
    """Current verification state of the farmer (INCOMPLETE/SUBMITTED/PENDING/APPROVED/REJECTED)."""
    status: str = Field(description="INCOMPLETE | SUBMITTED | PENDING | APPROVED | REJECTED")
    submitted_at: str | None = Field(default=None, description="ISO timestamp of last submission")
    reviewed_at: str | None = Field(default=None, description="ISO timestamp of SuperAdmin review")
    rejection_reason: str | None = Field(default=None, description="Why rejected (null unless REJECTED)")


class DocumentOut(BaseModel):
    """One uploaded document with its review status."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    doc_type: str = Field(description="cnic_front | cnic_back | farm_photo | profile")
    status: str = Field(description="PENDING | APPROVED | REJECTED")
    rejection_reason: str | None = None
