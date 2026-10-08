# ApnaDairy — farmer document upload/list endpoints (WEB Supabase project).
# Files go to the PRIVATE "farmer-photos" storage bucket at
# <profiles.id>/<kind>.<ext> (upserted, so re-upload replaces the old file).
# Uploading kind=profile_photo also updates farmer_profiles.photo_path.
# JWT auth on everything; the farmer identity always comes from the
# current_farmer dependency, never from the request.

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.core.deps import current_farmer, table
from app.db.supabase_client import get_web_client

router = APIRouter(prefix="/api/v1/farmer", tags=["farmer-documents"])

BUCKET = "farmer-photos"
_KINDS = ("cnic_front", "cnic_back", "profile_photo", "farm_photo")
_ALLOWED_EXT = {"jpg", "jpeg", "png"}
_MAX_BYTES = 5 * 1024 * 1024  # 5 MB per file


class DocumentUploadOut(BaseModel):
    """Result of a document upload."""

    kind: str = Field(description="cnic_front | cnic_back | profile_photo | farm_photo")
    path: str = Field(description="Storage path, e.g. <profiles.id>/cnic_front.jpg")


class DocumentInfoOut(BaseModel):
    """One known document kind with its stored path (null when not uploaded)."""

    kind: str = Field(description="cnic_front | cnic_back | profile_photo | farm_photo")
    path: str | None = Field(
        default=None, description="Stored path, or null when not uploaded yet"
    )


def _check_kind(kind: str) -> None:
    """Reject unknown document kinds with a 422."""
    if kind not in _KINDS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid kind: {kind!r}. Use one of: {', '.join(_KINDS)}.",
        )


@router.post("/documents", response_model=DocumentUploadOut)
async def upload_document(
    kind: str = Form(description="cnic_front | cnic_back | profile_photo | farm_photo"),
    file: UploadFile = File(description="Image file (JPG/PNG, max 5MB)"),
    ctx: tuple[dict, dict | None, dict | None] = Depends(current_farmer),
) -> DocumentUploadOut:
    """Upload one verification document to private storage (upsert)."""
    profile, _farmer_profile, _farmer_row = ctx
    user_id = (profile or {}).get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Caller profile has no id.")
    _check_kind(kind)

    ext = (
        file.filename.rsplit(".", 1)[-1].lower()
        if file.filename and "." in file.filename
        else ""
    )
    if ext not in _ALLOWED_EXT:
        raise HTTPException(
            status_code=422, detail="Only JPG or PNG image files are allowed."
        )
    content_type = (file.content_type or "").lower()
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(
            status_code=422, detail="Only JPG or PNG image files are allowed."
        )
    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="The uploaded file is empty.")
    if len(data) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="The file exceeds the 5MB limit.")

    path = f"{user_id}/{kind}.{ext}"
    try:
        get_web_client().storage.from_(BUCKET).upload(
            path,
            data,
            {"content-type": file.content_type or "image/jpeg", "upsert": "true"},
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Upload failed: {exc}")

    if kind == "profile_photo":
        # Keep the profile row pointing at the latest photo.
        table("farmer_profiles").update({"photo_path": path}).eq(
            "user_id", user_id
        ).execute()

    return DocumentUploadOut(kind=kind, path=path)


@router.get("/documents", response_model=list[DocumentInfoOut])
def list_documents(
    ctx: tuple[dict, dict | None, dict | None] = Depends(current_farmer),
) -> list[DocumentInfoOut]:
    """List the known document kinds with their stored paths for the caller."""
    profile, farmer_profile, _farmer_row = ctx
    user_id = (profile or {}).get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Caller profile has no id.")

    stored: dict[str, str] = {}
    try:
        items = get_web_client().storage.from_(BUCKET).list(user_id) or []
    except Exception:
        items = []
    for item in items:
        name = item.get("name") if isinstance(item, dict) else None
        if not name or "." not in name:
            continue
        stem = name.rsplit(".", 1)[0]
        if stem in _KINDS:
            stored[stem] = f"{user_id}/{name}"

    # farmer_profiles.photo_path is authoritative for the profile photo.
    photo_path = (farmer_profile or {}).get("photo_path")
    if photo_path:
        stored["profile_photo"] = photo_path

    return [
        DocumentInfoOut(kind=kind, path=stored.get(kind)) for kind in _KINDS
    ]
