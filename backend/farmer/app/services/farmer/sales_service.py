"""ApnaDairy — manager-driven daily sale flow (REAL Supabase, web project).

v2 flow:
  1. Manager starts a sale for one of his farmers (POST /start).
  2. Manager runs the IoT device test; readings come back (POST /{id}/iot-result).
  3. Service computes freshness score + AI price; the row carries the offer.
  4. Manager sends the offer (POST /{id}/offer — idempotent re-read).
  5. Farmer accepts (POST /{id}/accept -> batch created under the manager)
     or refuses (POST /{id}/refuse).

Table: milk_collections (web project, apnadairy-web). The accepted row IS the
batch: it sits under the area manager and later links to a payout.
Per the locked v2 scope the web Supabase database is the single database for
the web project is the single database, so these writes are intentional.

Auth/identity come from the shared cross-worker contract in app.core.deps:
  current_farmer  -> (profile, farmer_profile|None, farmer_row|None)
  current_manager -> (profile, area_manager row)
  get_market_price() -> float (env MARKET_MILK_PRICE_PER_L, default 220.0)
  table(name) -> web-bound query builder (app.db.supabase_client).

Ownership rules (enforced here, never in routers):
  * manager endpoints: the sale's area_manager_id must equal the caller's
    center; start additionally requires the farmer to be linked to that
    center (accepted farmer_requests, or farmers.area_manager_id).
  * farmer endpoints: the sale's farmer row must link to the caller
    (farmers.profile_id == caller profiles.id).
"""

from __future__ import annotations

import datetime

from app.core.deps import get_market_price
from app.db.supabase_client import first_row, iso, table

# ---------------------------------------------------------------------------
# TUNABLE pricing engine.
# ---------------------------------------------------------------------------


# TUNABLE — placeholder heuristic until the real AI model lands.
# Scores 0-100 from the four IoT signals using the FYP report benchmarks for
# pure Pakistani mixed raw milk (at ~25 C): pH 6.55-6.68, EC 4.0-5.5 mS/cm,
# storage at or below 4 C. Textbook ranges only — the real model must train
# on labeled samples from this device (never on these ranges).
def compute_freshness_score(
    temperature_c: float | None,
    ph: float | None,
    tds_ppm: float | None,
    ec_ms: float | None,
) -> float:
    """Return a 0-100 freshness score (placeholder heuristic, replace with AI)."""
    score = 100.0
    # Temperature: cold chain at or below 4 C. Warmer milk sours faster.
    if temperature_c is not None:
        if temperature_c > 4.0:
            score -= min(30.0, (temperature_c - 4.0) * 4.0)  # -4 per degree, cap -30
        elif temperature_c < 0.0:
            score -= min(10.0, abs(temperature_c) * 2.0)  # frozen probe guard
    # pH: pure milk 6.55-6.68. Below ~6.4 = souring/spoiled; above 6.8 abnormal.
    if ph is not None:
        if ph < 6.55:
            score -= min(40.0, (6.55 - ph) / 0.05 * 6.0)  # -6 per 0.05, cap -40
        elif ph > 6.68:
            score -= min(30.0, (ph - 6.68) / 0.05 * 5.0)
    # EC: pure milk 4.0-5.5 mS/cm. Below ~3.5 = watered down; above ~6 = risk.
    if ec_ms is not None:
        if ec_ms < 4.0:
            score -= min(25.0, (4.0 - ec_ms) / 0.1 * 1.5)
        elif ec_ms > 5.5:
            score -= min(25.0, (ec_ms - 5.5) / 0.1 * 1.5)
    # TDS is EC derived by a constant divisor (TDS/640) — the same signal
    # twice — so it only consistency-checks the EC reading here.
    if tds_ppm is not None and ec_ms:
        implied_ec = tds_ppm / 640.0
        if ec_ms > 0 and abs(implied_ec - ec_ms) / ec_ms > 0.5:
            score -= 5.0  # sensors disagree; small penalty
    return round(max(0.0, min(100.0, score)), 1)


# TUNABLE — locked formula: discount_pct = max(5, (100 - score) * 2).
# A perfect 100 still takes a 5% floor discount; every lost point below 100
# costs 2% more. Examples at market Rs 220/L:
#   score 95  -> 10%  -> Rs 198.00
#   score 90  -> 20%  -> Rs 176.00
#   score 80  -> 40%  -> Rs 132.00
# NOTE: the farmer's spoken example (95% -> Rs 170-180) was approximate; the
# formula above is the LOCKED one — do not "fix" it to match the example.
def compute_ai_price(
    freshness_score: float, market_price_per_l: float
) -> tuple[float, float]:
    """Return (price_per_l, discount_pct) from the locked AI price formula."""
    score = max(0.0, min(100.0, float(freshness_score)))
    discount_pct = max(5.0, (100.0 - score) * 2.0)
    price_per_l = float(market_price_per_l) * (1.0 - discount_pct / 100.0)
    return (round(price_per_l, 2), round(discount_pct, 1))


# ---------------------------------------------------------------------------
# Internal helpers.
# ---------------------------------------------------------------------------

_SALE_COLUMNS = (
    "id,area_manager_id,farmer_id,quantity_l,temperature_c,ph,ec_ms,tds_ppm,"
    "freshness_score,ai_price_per_l,ai_notes,price_per_l,total_amount,status,"
    "decided_at,reject_reason,receipt_no,collected_at,reading_at,payout_id"
)


def _utcnow() -> datetime.datetime:
    """Return current UTC time (timezone-aware)."""
    return datetime.datetime.now(datetime.timezone.utc)


def _get_sale(sale_id: str) -> dict:
    """Return one milk_collections row; raises ValueError when missing."""
    sale = first_row(
        table("milk_collections").select(_SALE_COLUMNS).eq("id", sale_id).limit(1).execute()
    )
    if sale is None:
        raise ValueError("Sale not found.")
    return sale


def _get_farmer_row(farmer_id: str) -> dict:
    """Return one web farmers row; raises ValueError when missing."""
    farmer = first_row(
        table("farmers")
        .select("id,profile_id,full_name,area_manager_id")
        .eq("id", farmer_id)
        .limit(1)
        .execute()
    )
    if farmer is None:
        raise ValueError("Farmer not found.")
    return farmer


def _require_center_sale(center_id: str, sale_id: str) -> dict:
    """Return the sale when it belongs to the manager's center.

    A sale from another center reads as "not found" — one center never sees
    another center's sales.
    """
    sale = _get_sale(sale_id)
    if sale.get("area_manager_id") != center_id:
        raise ValueError("Sale not found.")
    return sale


def _require_offered(sale: dict) -> dict:
    """Raise unless the sale is still awaiting the farmer's decision."""
    if sale.get("status") != "offered":
        raise ValueError(
            f"Sale is already {sale.get('status')}; only 'offered' sales can change."
        )
    return sale


def _farmer_linked_to_center(farmer: dict, center_id: str) -> bool:
    """True when the farmer sells to this center.

    Link = an ACCEPTED farmer_requests row for the center (farmer_requests
    references farmers.profile_id), OR farmers.area_manager_id == center.
    """
    if farmer.get("area_manager_id") == center_id:
        return True
    profile_id = farmer.get("profile_id")
    if not profile_id:
        return False
    req = first_row(
        table("farmer_requests")
        .select("id")
        .eq("farmer_id", profile_id)
        .eq("area_manager_id", center_id)
        .eq("status", "accepted")
        .limit(1)
        .execute()
    )
    if req is not None:
        return True
    # Defensive fallback: some installs reference farmers.id in farmer_requests.
    req = first_row(
        table("farmer_requests")
        .select("id")
        .eq("farmer_id", farmer.get("id"))
        .eq("area_manager_id", center_id)
        .eq("status", "accepted")
        .limit(1)
        .execute()
    )
    return req is not None


def _check_farmer_owns_sale(
    farmer_id: str, sale: dict, caller_profile_id: str | None
) -> dict:
    """Enforce farmer ownership: the sale's farmer row must link to the caller.

    Links via farmers.id == sale.farmer_id AND farmers.profile_id == caller
    profiles.id (when both are known).
    """
    if sale.get("farmer_id") != farmer_id:
        raise ValueError("Sale not found.")
    farmer = _get_farmer_row(sale["farmer_id"])
    if caller_profile_id and farmer.get("profile_id"):
        if farmer["profile_id"] != caller_profile_id:
            raise ValueError("Sale not found.")
    return farmer


def _names_for(sales: list[dict]) -> tuple[dict, dict]:
    """Map farmer ids -> full names and center ids -> center names."""
    farmer_ids = {s.get("farmer_id") for s in sales if s.get("farmer_id")}
    center_ids = {s.get("area_manager_id") for s in sales if s.get("area_manager_id")}
    farmers: dict[str, str] = {}
    centers: dict[str, str] = {}
    if farmer_ids:
        rows = (
            table("farmers").select("id,full_name").in_("id", list(farmer_ids)).execute().data
            or []
        )
        farmers = {r["id"]: r.get("full_name") or "Farmer" for r in rows}
    if center_ids:
        rows = (
            table("area_managers")
            .select("id,center_name")
            .in_("id", list(center_ids))
            .execute()
            .data
            or []
        )
        centers = {r["id"]: r.get("center_name") or "Center" for r in rows}
    return farmers, centers


def _sale_out(sale: dict, farmers: dict, centers: dict) -> dict:
    """Shape one sale row for list responses."""
    return {
        "id": sale.get("id"),
        "quantity_l": sale.get("quantity_l"),
        "price_per_l": sale.get("price_per_l"),
        "total_amount": sale.get("total_amount"),
        "freshness_score": sale.get("freshness_score"),
        "status": sale.get("status"),
        "decided_at": iso(sale.get("decided_at")),
        "collected_at": iso(sale.get("collected_at")),
        "receipt_no": sale.get("receipt_no"),
        "farmer_name": farmers.get(sale.get("farmer_id") or ""),
        "manager_name": centers.get(sale.get("area_manager_id") or ""),
    }


# ---------------------------------------------------------------------------
# Public API (called by the router; routers never touch the DB directly).
# ---------------------------------------------------------------------------


def start_sale(center_id: str, farmer_id: str, quantity_l: float) -> dict:
    """Manager starts a daily sale for a linked farmer.

    Inserts a milk_collections row with status 'offered'. price_per_l is set
    to the market price provisionally (satisfies the offered_needs_price
    constraint) until the IoT test replaces it with the AI price.
    """
    if quantity_l is None or float(quantity_l) <= 0:
        raise ValueError("Quantity must be greater than zero litres.")
    farmer = _get_farmer_row(farmer_id)
    if not _farmer_linked_to_center(farmer, center_id):
        raise ValueError("This farmer is not linked to your center.")
    market_price = get_market_price()
    row = {
        "farmer_id": farmer_id,
        "area_manager_id": center_id,
        "quantity_l": float(quantity_l),
        "status": "offered",
        "collected_at": _utcnow().isoformat(),
        "price_per_l": round(market_price, 2),  # provisional; IoT result replaces it
        "total_amount": round(market_price * float(quantity_l), 2),
    }
    res = table("milk_collections").insert(row).execute()
    inserted = first_row(res)
    sale_id = (inserted or {}).get("id")
    if not sale_id:
        # Fallback for test doubles whose insert() echo omits the new id:
        # re-read the newest matching offered row. Real Supabase always
        # echoes the inserted id, so this path never runs in production.
        inserted = first_row(
            table("milk_collections")
            .select("id")
            .eq("farmer_id", farmer_id)
            .eq("area_manager_id", center_id)
            .eq("status", "offered")
            .order("collected_at", desc=True)
            .limit(1)
            .execute()
        )
        sale_id = (inserted or {}).get("id")
    if not sale_id:
        raise ValueError("Could not start the sale. Please try again.")
    return {"sale_id": sale_id}


def record_iot_result(
    center_id: str,
    sale_id: str,
    temperature_c: float,
    ph: float,
    tds_ppm: float,
    ec_ms: float,
) -> dict:
    """Manager posts IoT readings; score + AI price are computed and stored."""
    sale = _require_offered(_require_center_sale(center_id, sale_id))
    score = compute_freshness_score(temperature_c, ph, tds_ppm, ec_ms)
    price, discount = compute_ai_price(score, get_market_price())
    quantity = float(sale.get("quantity_l") or 0)
    total = round(price * quantity, 2)
    update = {
        "temperature_c": temperature_c,
        "ph": ph,
        "ec_ms": ec_ms,
        "tds_ppm": tds_ppm,
        "freshness_score": score,
        "ai_price_per_l": price,
        "price_per_l": price,
        "total_amount": total,
        "reading_at": _utcnow().isoformat(),
        "ai_notes": (
            f"Freshness score {score:.1f}/100; "
            f"AI discount {discount:.1f}% below market price."
        ),
    }
    table("milk_collections").update(update).eq("id", sale_id).execute()
    return {
        "freshness_score": score,
        "discount_pct": discount,
        "price_per_l": price,
        "total_amount": total,
    }


def get_offer_summary(center_id: str, sale_id: str) -> dict:
    """Idempotent "send offer": validate the price is set, return the summary.

    Safe to call repeatedly — it writes nothing; both parties see the same
    numbers from the milk_collections row.
    """
    sale = _require_offered(_require_center_sale(center_id, sale_id))
    if sale.get("reading_at") is None:
        raise ValueError("IoT test result not recorded yet.")
    score = sale.get("freshness_score")
    _price, discount = compute_ai_price(score or 0, get_market_price())
    farmers, centers = _names_for([sale])
    return {
        "sale_id": sale.get("id"),
        "farmer_id": sale.get("farmer_id"),
        "farmer_name": farmers.get(sale.get("farmer_id") or ""),
        "center_name": centers.get(sale.get("area_manager_id") or ""),
        "quantity_l": sale.get("quantity_l"),
        "price_per_l": sale.get("price_per_l"),
        "total_amount": sale.get("total_amount"),
        "freshness_score": score,
        "discount_pct": discount,
        "status": sale.get("status"),
        "collected_at": iso(sale.get("collected_at")),
    }


def accept_sale(
    farmer_id: str, sale_id: str, caller_profile_id: str | None = None
) -> dict:
    """Farmer accepts the offer. The accepted row IS the batch under the manager."""
    sale = _require_offered(_get_sale(sale_id))
    _check_farmer_owns_sale(farmer_id, sale, caller_profile_id)
    if sale.get("reading_at") is None:
        raise ValueError("IoT test result not recorded yet.")
    receipt_no = f"RCPT-{_utcnow().strftime('%Y%m%d')}-{str(sale_id)[:8].upper()}"
    table("milk_collections").update(
        {
            "status": "accepted",
            "decided_at": _utcnow().isoformat(),
            "receipt_no": receipt_no,
        }
    ).eq("id", sale_id).execute()
    return {"receipt_no": receipt_no, "total_amount": sale.get("total_amount")}


def refuse_sale(
    farmer_id: str,
    sale_id: str,
    reason: str | None = None,
    caller_profile_id: str | None = None,
) -> dict:
    """Farmer refuses the offer; the sale stays in history as rejected."""
    sale = _require_offered(_get_sale(sale_id))
    _check_farmer_owns_sale(farmer_id, sale, caller_profile_id)
    table("milk_collections").update(
        {
            "status": "rejected",
            "reject_reason": reason,
            "decided_at": _utcnow().isoformat(),
        }
    ).eq("id", sale_id).execute()
    return {"sale_id": sale_id, "status": "rejected"}


def list_sales_for_farmer(farmer_id: str) -> list[dict]:
    """List the farmer's own sales, newest first."""
    _get_farmer_row(farmer_id)  # 404-style guard; no data leak for unknown ids
    res = (
        table("milk_collections")
        .select(_SALE_COLUMNS)
        .eq("farmer_id", farmer_id)
        .order("collected_at", desc=True)
        .execute()
    )
    sales = res.data or []
    farmers, centers = _names_for(sales)
    return [_sale_out(s, farmers, centers) for s in sales]


def list_sales_for_center(center_id: str) -> list[dict]:
    """List the center's sales across all its farmers, newest first."""
    res = (
        table("milk_collections")
        .select(_SALE_COLUMNS)
        .eq("area_manager_id", center_id)
        .order("collected_at", desc=True)
        .execute()
    )
    sales = res.data or []
    farmers, centers = _names_for(sales)
    return [_sale_out(s, farmers, centers) for s in sales]
