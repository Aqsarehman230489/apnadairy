# ApnaDairy — Tests for the manager-driven daily sale flow (v2).
# The autouse fake_supabase fixture (conftest.py) patches get_web_client()
# everywhere, so these tests run with zero network. Auth is exercised via
# dependency_overrides on the exact dependency callables (same pattern as
# test_linking.py) — no JWTs needed.
#
# Flow under test (all web project, milk_collections):
#   manager POST /sales/start -> POST /sales/{id}/iot-result (AI score+price)
#   -> POST /sales/{id}/offer -> farmer POST /sales/{id}/accept
#   (batch created under the manager) or /refuse.

import pytest
from fastapi.testclient import TestClient

from app.api.v1.farmer import sales as sales_router
from app.main import app
from app.services.farmer.sales_service import compute_ai_price, compute_freshness_score

FARMER_CTX = (
    {"id": "prof-farmer-1", "full_name": "Allah Ditta", "role": "farmer"},
    {"user_id": "prof-farmer-1", "city": "Islamabad"},
    {
        "id": "farm-1",
        "profile_id": "prof-farmer-1",
        "full_name": "Allah Ditta",
        "area_manager_id": "am-isb-1",
    },
)
MANAGER_CTX = (
    {"id": "mgr-user-1", "full_name": "Kashif Mehmood", "role": "manager"},
    {
        "id": "am-isb-1",
        "user_id": "mgr-user-1",
        "center_name": "Margalla Dairy Center",
        "city": "Islamabad",
    },
)
OTHER_MANAGER_CTX = (
    {"id": "mgr-user-9", "full_name": "Other Manager", "role": "manager"},
    {"id": "am-other-1", "user_id": "mgr-user-9", "center_name": "Other Center"},
)

# Readings for perfect milk: cold, pH/EC in range, TDS consistent with EC.
GOOD_READINGS = {
    "temperature_c": 3.0,
    "ph": 6.60,
    "tds_ppm": 2624.0,
    "ec_ms": 4.10,
}


@pytest.fixture
def sale_env(fake_supabase):
    """Seed the web rows the sale flow needs; return the fake client."""
    store = fake_supabase._store
    store["area_managers"].append(
        {
            "id": "am-isb-1",
            "user_id": "mgr-user-1",
            "center_name": "Margalla Dairy Center",
            "city": "Islamabad",
        }
    )
    store["area_managers"].append(
        {"id": "am-other-1", "user_id": "mgr-user-9", "center_name": "Other Center"}
    )
    store.setdefault("farmers", []).append(
        {
            "id": "farm-1",
            "profile_id": "prof-farmer-1",
            "full_name": "Allah Ditta",
            "area_manager_id": "am-isb-1",
        }
    )
    store.setdefault("farmers", []).append(
        {
            "id": "farm-2",
            "profile_id": "prof-farmer-2",
            "full_name": "Ghulam Abbas",
            "area_manager_id": None,  # not linked to any center
        }
    )
    store.setdefault("milk_collections", [])
    return fake_supabase


@pytest.fixture
def api_client(sale_env):
    """One TestClient; each test selects the caller via _as_manager/_as_farmer.

    Overrides are per-request globals on the app, so a single client with
    explicit role switches is safer than parallel role fixtures.
    """
    yield TestClient(app)
    app.dependency_overrides.clear()


def _as_manager():
    """Act as the am-isb-1 area manager for subsequent requests."""
    app.dependency_overrides[sales_router.current_manager] = lambda: MANAGER_CTX
    app.dependency_overrides[sales_router._optional_manager] = lambda: MANAGER_CTX
    app.dependency_overrides[sales_router._optional_farmer] = lambda: None


def _as_farmer():
    """Act as farmer farm-1 (linked to am-isb-1) for subsequent requests."""
    app.dependency_overrides[sales_router.current_farmer] = lambda: FARMER_CTX
    app.dependency_overrides[sales_router._optional_farmer] = lambda: FARMER_CTX
    app.dependency_overrides[sales_router._optional_manager] = lambda: None


def _as_other_manager():
    """Act as a DIFFERENT center's manager (isolation checks)."""
    app.dependency_overrides[sales_router.current_manager] = (
        lambda: OTHER_MANAGER_CTX
    )
    app.dependency_overrides[sales_router._optional_manager] = (
        lambda: OTHER_MANAGER_CTX
    )
    app.dependency_overrides[sales_router._optional_farmer] = lambda: None


# Backwards-compatible names used by the flow tests below: each test calls
# exactly one of these, which selects the role on the shared client.
@pytest.fixture
def manager_client(api_client):
    _as_manager()
    return api_client


@pytest.fixture
def farmer_client(api_client):
    _as_farmer()
    return api_client


def _start(manager_client, farmer_id="farm-1", quantity_l=20.0):
    r = manager_client.post(
        "/api/v1/farmer/sales/start",
        json={"farmer_id": farmer_id, "quantity_l": quantity_l},
    )
    assert r.status_code == 200, r.text
    return r.json()["sale_id"]


def _full_offer(manager_client, sale_id, readings=GOOD_READINGS):
    r = manager_client.post(
        f"/api/v1/farmer/sales/{sale_id}/iot-result", json=readings
    )
    assert r.status_code == 200, r.text
    r = manager_client.post(f"/api/v1/farmer/sales/{sale_id}/offer")
    assert r.status_code == 200, r.text
    return r.json()


# --- AI price engine (the ONE locked formula) ---


def test_ai_price_formula_locked_examples():
    """discount_pct = max(5, (100 - score) * 2); price from market Rs 220."""
    price, discount = compute_ai_price(95, 220)
    assert discount == 10.0
    assert price == 198.0
    price, discount = compute_ai_price(100, 220)
    assert discount == 5.0  # the 5% floor
    assert price == 209.0
    price, discount = compute_ai_price(90, 220)
    assert discount == 20.0
    assert price == 176.0
    price, discount = compute_ai_price(80, 220)
    assert discount == 40.0
    assert price == 132.0


def test_freshness_score_perfect_milk():
    """In-range readings score 100 (TDS/EC consistency check passes)."""
    assert compute_freshness_score(3.0, 6.60, 2624.0, 4.10) == 100.0


def test_freshness_score_degrades():
    """Warm, souring, watered milk scores well below 100."""
    score = compute_freshness_score(8.0, 6.40, 2200.0, 3.4)
    assert score < 70.0


# --- the daily sale flow ---


def test_sale_start_and_manager_ownership(manager_client):
    """Manager starts a sale for a linked farmer; unlinked farmer is 403."""
    sale_id = _start(manager_client)
    assert sale_id

    r = manager_client.post(
        "/api/v1/farmer/sales/start",
        json={"farmer_id": "farm-2", "quantity_l": 10.0},
    )
    assert r.status_code == 403

    r = manager_client.post(
        "/api/v1/farmer/sales/start",
        json={"farmer_id": "farm-1", "quantity_l": 0},
    )
    assert r.status_code == 422  # schema: quantity must be positive


def test_iot_result_computes_score_and_price(manager_client):
    """IoT readings -> freshness score + locked AI price on the sale row."""
    sale_id = _start(manager_client, quantity_l=20.0)
    r = manager_client.post(
        f"/api/v1/farmer/sales/{sale_id}/iot-result", json=GOOD_READINGS
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["freshness_score"] == 100.0
    assert body["discount_pct"] == 5.0
    assert body["price_per_l"] == 209.0
    assert body["total_amount"] == 4180.0


def test_offer_is_idempotent(manager_client):
    """POST /offer re-reads the same numbers; both parties see them."""
    sale_id = _start(manager_client)
    first = _full_offer(manager_client, sale_id)
    second = _full_offer(manager_client, sale_id)
    assert first["price_per_l"] == second["price_per_l"] == 209.0
    assert first["farmer_name"] == "Allah Ditta"
    assert first["center_name"] == "Margalla Dairy Center"
    assert first["status"] == "offered"


def test_accept_creates_batch_under_manager(api_client, sale_env):
    """Farmer accepts -> sale accepted with receipt; the row is the batch."""
    _as_manager()
    sale_id = _start(api_client)
    _full_offer(api_client, sale_id)

    _as_farmer()
    r = api_client.post(f"/api/v1/farmer/sales/{sale_id}/accept")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["receipt_no"].startswith("RCPT-")
    assert body["total_amount"] == 4180.0

    row = next(
        r
        for r in sale_env._store["milk_collections"]
        if r["id"] == sale_id
    )
    assert row["status"] == "accepted"
    assert row["area_manager_id"] == "am-isb-1"  # batch under the manager
    assert row["farmer_id"] == "farm-1"
    assert row["receipt_no"] == body["receipt_no"]

    # Double accept is rejected.
    r = api_client.post(f"/api/v1/farmer/sales/{sale_id}/accept")
    assert r.status_code == 400


def test_refuse_keeps_history(api_client, sale_env):
    """Farmer refuses -> sale stays in history as rejected."""
    _as_manager()
    sale_id = _start(api_client)
    _full_offer(api_client, sale_id)

    _as_farmer()
    r = api_client.post(
        f"/api/v1/farmer/sales/{sale_id}/refuse", json={"reason": "Price too low"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "rejected"

    row = next(
        r for r in sale_env._store["milk_collections"] if r["id"] == sale_id
    )
    assert row["status"] == "rejected"
    assert row["reject_reason"] == "Price too low"


def test_accept_before_iot_result_is_400(api_client):
    """A sale without IoT readings cannot be accepted (or offered)."""
    _as_manager()
    sale_id = _start(api_client)
    r = api_client.post(f"/api/v1/farmer/sales/{sale_id}/offer")
    assert r.status_code == 400

    _as_farmer()
    r = api_client.post(f"/api/v1/farmer/sales/{sale_id}/accept")
    assert r.status_code == 400


def test_cross_center_isolation(api_client):
    """One center never sees another center's sales (404, not 403)."""
    _as_manager()
    sale_id = _start(api_client)

    _as_other_manager()
    r = api_client.post(
        f"/api/v1/farmer/sales/{sale_id}/iot-result", json=GOOD_READINGS
    )
    assert r.status_code == 404
    r = api_client.post(f"/api/v1/farmer/sales/{sale_id}/offer")
    assert r.status_code == 404


def test_sales_history_scoped(api_client):
    """Farmer sees own sales; manager sees the center's; other center sees none."""
    _as_manager()
    sale_id = _start(api_client)
    _full_offer(api_client, sale_id)

    _as_farmer()
    r = api_client.get("/api/v1/farmer/sales/")
    assert r.status_code == 200, r.text
    assert [s["id"] for s in r.json()] == [sale_id]
    assert r.json()[0]["manager_name"] == "Margalla Dairy Center"

    _as_manager()
    r = api_client.get("/api/v1/farmer/sales/")
    assert r.status_code == 200, r.text
    assert [s["id"] for s in r.json()] == [sale_id]
    assert r.json()[0]["farmer_name"] == "Allah Ditta"

    _as_other_manager()
    r = api_client.get("/api/v1/farmer/sales/")
    assert r.status_code == 200, r.text
    assert r.json() == []


def test_farmer_without_link_cannot_accept(api_client):
    """A farmer with no farmers row yet gets 403 on accept (nothing to sell)."""
    app.dependency_overrides[sales_router.current_farmer] = lambda: (
        {"id": "prof-new", "role": "farmer"},
        None,
        None,
    )
    r = api_client.post("/api/v1/farmer/sales/some-id/accept")
    assert r.status_code == 403


def test_unknown_sale_is_404(manager_client):
    """Unknown sale ids read as 404."""
    r = manager_client.post("/api/v1/farmer/sales/nope/iot-result", json=GOOD_READINGS)
    assert r.status_code == 404
