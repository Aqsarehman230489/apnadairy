# ApnaDairy — Farmer operational SQLAlchemy models.
# Payments, notifications, and complaints for one farmer.
# v2 web-DB mapping: the primary database is the existing apnadairy-web
# Supabase project (the single database).
#   Payment     -> web `farmer_payouts` (receipt_no): one payment from a manager
#                  to a farmer for a confirmed purchase. Admin roles have
#                  visibility only — no role in milk sales; SuperAdmin verifies
#                  the farmer profile only.
#   farmer_id FKs point at the `farmers` table of the web project's schema
#   (read via external IDs in production). No tables are created from these
#   models during the sprint — the demo backend serves mock data.
# Alembic autogenerate can pick them up later when a real DB is attached.

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Shared declarative base for the farmer operational models."""


class Payment(Base):
    """One payment from a manager to a farmer for a confirmed purchase."""

    __tablename__ = "farmer_payouts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    farmer_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("farmers.id"), index=True
    )
    purchase_ref: Mapped[str] = mapped_column(String(32))
    litres: Mapped[float] = mapped_column(Float)
    rate_per_litre: Mapped[float] = mapped_column(Float)
    amount: Mapped[float] = mapped_column(Float)
    method: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(16), default="PENDING")
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Notification(Base):
    """One inbox item for a farmer (verification, offer, payment, etc.)."""

    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    farmer_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("farmers.id"), index=True
    )
    title: Mapped[str] = mapped_column(String(128))
    message: Mapped[str] = mapped_column(String(512))
    type: Mapped[str] = mapped_column(String(32))
    deep_link: Mapped[str | None] = mapped_column(String(128), nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Complaint(Base):
    """A help/complaint ticket raised by a farmer."""

    __tablename__ = "complaints"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    farmer_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("farmers.id"), index=True
    )
    category: Mapped[str] = mapped_column(String(32))
    message: Mapped[str] = mapped_column(String(2000))
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="OPEN")
    admin_reply: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
