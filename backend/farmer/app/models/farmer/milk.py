"""ApnaDairy — SQLAlchemy models for the farmer milk workflow.

v2 web-DB mapping (primary database = the existing apnadairy-web Supabase
project — the single database):
  milk_collections — web table recording each sale: quantity_l, temperature_c,
                     ph, ec_ms. Every manager-driven v2 sale auto-creates a
                     batch under the area manager and a row here.
  farmer_requests  — farmer -> area-manager registration requests (farmer picks
                     a city, sees area managers, requests ONE; the manager
                     accepts; farmer sells daily to that manager only).
  farmers          — web farmer registry (full_name, village, cattle_count).
  farmer_payouts   — web payout records (receipt_no).

LEGACY (v1, superseded by the new manager-driven sales flow):
  milk_requests — a farmer's "Add New Milk" request to one of his assigned managers.
  offers        — a manager's tested + AI-priced offer in response to a request.
These two tables are kept as read shapes only; the v1 routers that wrote them
were removed. The v2 flow is: manager selects farmer -> IoT test -> live data +
AI score + AI price shown to both -> manager offers -> farmer accept/refuse ->
milk_collections row + batch.

Business rules (who may accept/refuse, allowed status transitions) live in
app/services/farmer/, NOT here — models are dumb storage shapes.
"""

from __future__ import annotations

import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _utcnow() -> datetime.datetime:
    """Return the current UTC time (used as column default)."""
    return datetime.datetime.now(datetime.timezone.utc)


class Base(DeclarativeBase):
    """Local declarative base for farmer models.

    TODO: consolidate into app/db/base.py when the real DB session lands.
    """


class MilkRequest(Base):
    """One milk-sale request from a farmer to an assigned area manager."""

    __tablename__ = "milk_requests"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    farmer_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("farmers.id"), index=True, nullable=False
    )
    manager_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    litres: Mapped[float] = mapped_column(Float, nullable=False)
    # SENT -> VIEWED -> TESTING -> OFFERED -> CLOSED (transitions enforced in service)
    status: Mapped[str] = mapped_column(String(24), default="SENT", nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )


class Offer(Base):
    """A manager's offer on a milk request: IoT test readings + AI score/category + price."""

    __tablename__ = "offers"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    request_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("milk_requests.id"), index=True, nullable=False
    )
    farmer_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("farmers.id"), index=True, nullable=False
    )
    manager_id: Mapped[str] = mapped_column(String(64), nullable=False)
    litres: Mapped[float] = mapped_column(Float, nullable=False)
    # IoT test readings (demonstration values in dev)
    temperature: Mapped[float] = mapped_column(Float, nullable=True)
    ph: Mapped[float] = mapped_column(Float, nullable=True)
    tds: Mapped[float] = mapped_column(Float, nullable=True)
    ec: Mapped[float] = mapped_column(Float, nullable=True)
    # AI recommendation (demonstration values in dev)
    ai_score: Mapped[float] = mapped_column(Float, nullable=True)
    ai_category: Mapped[str] = mapped_column(String(8), nullable=True)  # A / B / C
    price_per_litre: Mapped[float] = mapped_column(Float, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    # PENDING -> ACCEPTED | REFUSED | EXPIRED ; ACCEPTED -> PURCHASE_PENDING (manager side)
    status: Mapped[str] = mapped_column(String(24), default="PENDING", nullable=False)
    expires_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
