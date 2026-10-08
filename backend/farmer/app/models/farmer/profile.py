# ApnaDairy — SQLAlchemy models for farmer profile + verification documents.
# v2 web-DB mapping: this backend reads/writes the existing apnadairy-web
# Supabase project as its primary database (the single web project).
# Tables involved:
#   farmer_profiles  — portal-side profile row per farmer (web DB, keyed by
#                       Supabase auth user_id); mirrors web `farmers`
#                       (full_name, village, cattle_count) where they overlap.
#   farmer_documents — CNIC front/back, farm photos, profile photo + review status.
#   farmers          — web project's farmer registry (full_name, village,
#                       cattle_count); Supabase Admin verifies the farmer here.
#   farmer_requests  — farmer -> area-manager registration requests (one manager,
#                       accepted by the manager; farmer sells daily to that manager).
# NOTE: no engine/session is created here. In production these map to the
# Supabase tables via the FastAPI service layer.

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Shared declarative base for farmer models (no DB connection here)."""
    pass


class FarmerProfile(Base):
    """One profile row per farmer; user_id links to Supabase auth.users."""
    __tablename__ = "farmer_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    profile_photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    farm_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    village: Mapped[str | None] = mapped_column(String(120), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    tehsil: Mapped[str | None] = mapped_column(String(120), nullable=True)
    district: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cow_count: Mapped[int] = mapped_column(Integer, default=0)
    buffalo_count: Mapped[int] = mapped_column(Integer, default=0)
    daily_capacity_litres: Mapped[float] = mapped_column(Float, default=0.0)
    verification_status: Mapped[str] = mapped_column(String(20), default="INCOMPLETE")
    role: Mapped[str] = mapped_column(String(20), default="farmer")

    documents: Mapped[list["FarmerDocument"]] = relationship(
        "FarmerDocument", back_populates="farmer", cascade="all, delete-orphan"
    )


class FarmerDocument(Base):
    """One row per uploaded verification document with its review status."""
    __tablename__ = "farmer_documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    farmer_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("farmer_profiles.id"), nullable=False
    )
    doc_type: Mapped[str] = mapped_column(String(40), nullable=False)  # cnic_front | cnic_back | farm_photo | profile
    file_path: Mapped[str] = mapped_column(Text, nullable=False)  # private storage path, never a public URL
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING | APPROVED | REJECTED
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    farmer: Mapped["FarmerProfile"] = relationship("FarmerProfile", back_populates="documents")
