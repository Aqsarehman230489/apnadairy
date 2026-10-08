# ApnaDairy — Tests for the farmer home stats endpoint (REAL web-schema code path).
# The autouse fake_supabase fixture (conftest.py) patches every service's
# get_web_client(), so these tests run with zero network.
#
# Contract under test: GET /api/v1/farmer/stats -> FarmerStatsResponse
#   total_milk_l / today_milk_l / total_revenue / money_earned /
#   registered_manager / total_sales
# Only milk_collections rows with status='accepted' count toward the numbers.

import datetime
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from app.core import deps as deps_mod
from app.main import app
from app.services.farmer import dashboard_service

client = TestClient(app)


def test_stats_returns_200_with_expected_shape():
    """GET /api/v1/farmer/stats returns 200 and the v2 stats payload shape."""
    resp = client.get("/api/v1/farmer/stats")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    # Three accepted collections: 20 + 40 + 25 L.
    assert data["total_milk_l"] == 85.0
    assert data["total_sales"] == 3
    # Revenue comes from the accepted collections' total_amount.
    assert data["total_revenue"] == 15100.0
    assert data["money_earned"] == 15100.0
    # None of the seeded collections is from today (Asia/Karachi).
    assert data["today_milk_l"] == 0.0
    # Registered manager resolves via farmers.area_manager_id -> mgr-1.
    manager = data["registered_manager"]
    assert manager is not None
    assert manager["center_name"] == "Bilal Traders"


def test_stats_today_milk_counts_karachi_today(fake_supabase):
    """A collection timestamped today (Karachi) lands in today_milk_l."""
    now_khi = datetime.datetime.now(ZoneInfo("Asia/Karachi"))
    fake_supabase._store["milk_collections"].append(
        {
            "id": "mc-today",
            "area_manager_id": "mgr-1",
            "farmer_id": "farmer-001",
            "quantity_l": 12.5,
            "total_amount": 2250.0,
            "status": "accepted",
            "collected_at": now_khi.isoformat(),
        }
    )
    resp = client.get("/api/v1/farmer/stats")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["today_milk_l"] == 12.5
    assert data["total_milk_l"] == 97.5
    assert data["total_sales"] == 4


def test_stats_unlinked_farmer_gets_zeros():
    """A farmer with no web farmers row yet sees zeros + null manager (no 500)."""
    app.dependency_overrides[deps_mod.current_farmer] = lambda: (
        {"id": "prof-new", "role": "farmer"},
        None,
        None,
    )
    try:
        resp = client.get("/api/v1/farmer/stats")
    finally:
        app.dependency_overrides.clear()
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total_milk_l"] == 0.0
    assert data["today_milk_l"] == 0.0
    assert data["total_revenue"] == 0.0
    assert data["money_earned"] == 0.0
    assert data["total_sales"] == 0
    assert data["registered_manager"] is None


def test_stats_service_none_row_is_empty():
    """Service contract: get_farmer_stats(None) never raises."""
    out = dashboard_service.get_farmer_stats(None)
    assert out.total_milk_l == 0.0
    assert out.registered_manager is None


def test_health_check_ok():
    """Sanity check that the app boots and the health probe works."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
