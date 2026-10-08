# ApnaDairy — Farmer complaints HTTP router.
# Thin layer: auth dependency -> service call -> validated response.
# Route order matters: POST /complaints before GET /complaints/{id} is fine,
# but GET /complaints must come before GET /complaints/{id} — it does.

from fastapi import APIRouter, Depends

from app.core.deps import current_farmer, require_web_farmer_id
from app.schemas.farmer.complaint import ComplaintCreate, ComplaintOut
from app.services.farmer.complaint_service import (
    create_complaint,
    get_complaint,
    get_complaints,
)

router = APIRouter(prefix="/api/v1/farmer", tags=["farmer-complaints"])


@router.get("/complaints", response_model=list[ComplaintOut])
def read_complaints(
    ctx: tuple = Depends(current_farmer),
) -> list[ComplaintOut]:
    """List the farmer's complaints, newest first."""
    return get_complaints(require_web_farmer_id(ctx))


@router.post("/complaints", response_model=ComplaintOut, status_code=201)
def file_complaint(
    payload: ComplaintCreate, ctx: tuple = Depends(current_farmer)
) -> ComplaintOut:
    """File a new complaint; it opens with status OPEN."""
    return create_complaint(require_web_farmer_id(ctx), payload)


@router.get("/complaints/{complaint_id}", response_model=ComplaintOut)
def read_complaint(
    complaint_id: str, ctx: tuple = Depends(current_farmer)
) -> ComplaintOut:
    """Return one complaint with its admin reply; 404 if unknown."""
    return get_complaint(require_web_farmer_id(ctx), complaint_id)
