# ApnaDairy — Tests for the v2 farmer<->manager linking flow (REAL web-schema code path).
# The autouse fake_supabase fixture (conftest.py) patches get_web_client() in
# manager_service; the link_env fixture below seeds the linking tables and
# points linking_service at the same fake. No test touches the network.

import pytest
from fastapi.testclient import TestClient

from app.core import deps as deps_mod
from app.main import app
from app.services.farmer import linking_service, manager_service
from app.services.farmer.linking_service import (
    AlreadyLinkedError,
    DuplicateRequestError,
    ManagerNotFoundError,
    NoPendingRequestError,
)
from app.services.farmer.manager_service import (
    RequestNotFoundError,
    RequestStateError,
)

FARMER_CTX = (
    {
        "id": "prof-farmer-1",
        "full_name": "Allah Ditta",
        "phone": "0333-4444444",
        "role": "farmer",
    },
    {"user_id": "prof-farmer-1", "city": "Islamabad"},
    {"id": "farm-1", "profile_id": "prof-farmer-1", "area_manager_id": None},
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


@pytest.fixture
def link_env(fake_supabase, monkeypatch):
    """Seed linking tables; point linking_service at the fake web client."""
    fake = fake_supabase
    store = fake._store
    store["area_managers"].extend(
        [
            {
                "id": "am-isb-1",
                "user_id": "mgr-user-1",
                "center_name": "Margalla Dairy Center",
                "address": "G-9 Markaz",
                "city": "Islamabad",
            },
            {
                "id": "am-isb-2",
                "user_id": "mgr-user-2",
                "center_name": "Rawal Milk Point",
                "address": "Satellite Town",
                "city": "islamabad",  # lowercase on purpose (case-insensitive match)
            },
            {
                "id": "am-lhr-1",
                "user_id": "mgr-user-3",
                "center_name": "Ravi Dairy",
                "address": "Model Town",
                "city": "Lahore",
            },
        ]
    )
    store["profiles"].extend(
        [
            {
                "id": "mgr-user-1",
                "full_name": "Kashif Mehmood",
                "phone": "0300-1111111",
                "role": "manager",
            },
            {
                "id": "mgr-user-2",
                "full_name": "Nadeem Akhtar",
                "phone": "0300-2222222",
                "role": "manager",
            },
            {
                "id": "prof-farmer-1",
                "full_name": "Allah Ditta",
                "phone": "0333-4444444",
                "role": "farmer",
            },
            {
                "id": "prof-farmer-2",
                "full_name": "Ghulam Abbas",
                "phone": "0333-5555555",
                "role": "farmer",
            },
        ]
    )
    store.setdefault("farmers", []).append(
        {"id": "farm-1", "profile_id": "prof-farmer-1", "area_manager_id": None}
    )
    store.setdefault("farmer_profiles", []).append(
        {
            "user_id": "prof-farmer-1",
            "city": "Islamabad",
            "cattle_count": 8,
            "daily_litres": 25.5,
        }
    )
    store.setdefault("farmer_requests", [])
    monkeypatch.setattr(
        "app.services.farmer.linking_service.get_web_client",
        lambda: fake,
        raising=False,
    )
    return fake


@pytest.fixture
def api_client(link_env):
    """TestClient with current_farmer/current_manager overridden (no JWTs)."""
    app.dependency_overrides[deps_mod.current_farmer] = lambda: FARMER_CTX
    app.dependency_overrides[deps_mod.current_manager] = lambda: MANAGER_CTX
    yield TestClient(app)
    app.dependency_overrides.clear()


def _farmers_row(store, profile_id="prof-farmer-1"):
    """Find the web farmers row for a profile (default seed rows come first)."""
    return next(
        r for r in store["farmers"] if r.get("profile_id") == profile_id
    )


def _seed_request(store, **kw):
    """Append a farmer_requests row to the fake store; return it."""
    row = {
        "id": kw.get("id", f"req-{len(store['farmer_requests']) + 1}"),
        "farmer_id": kw.get("farmer_id", "prof-farmer-1"),
        "area_manager_id": kw.get("area_manager_id", "am-isb-1"),
        "note": kw.get("note"),
        "status": kw.get("status", "pending"),
        "reason": kw.get("reason"),
        "created_at": kw.get("created_at", "2026-10-08T00:00:00+00:00"),
        "answered_at": kw.get("answered_at"),
        "ended_at": kw.get("ended_at"),
    }
    store["farmer_requests"].append(row)
    return row


# --- farmer service: cities / managers ---


def test_list_cities_sorted_distinct(link_env):
    """GET cities: distinct non-null cities, sorted (mgr-1 has no city)."""
    cities = linking_service.list_cities()
    assert cities == sorted(cities)
    assert set(cities) == {"Islamabad", "Lahore", "islamabad"}
    assert None not in cities


def test_list_managers_by_city_case_insensitive(link_env):
    """City match is case-insensitive; manager name/phone join via profiles."""
    rows = linking_service.list_managers_by_city("ISLAMABAD")
    assert {r.id for r in rows} == {"am-isb-1", "am-isb-2"}
    by_id = {r.id: r for r in rows}
    assert by_id["am-isb-1"].manager_name == "Kashif Mehmood"
    assert by_id["am-isb-1"].phone == "0300-1111111"
    assert by_id["am-isb-1"].address == "G-9 Markaz"
    assert by_id["am-isb-2"].manager_name == "Nadeem Akhtar"


def test_list_managers_unknown_city_empty(link_env):
    assert linking_service.list_managers_by_city("Karachi") == []


# --- farmer service: request lifecycle ---


def test_create_request_ok(link_env):
    """POST creates a pending request with farmer_id = profiles.id."""
    out = linking_service.create_manager_request("prof-farmer-1", "am-isb-1", "hello")
    assert out.status == "pending"
    assert out.manager is not None
    assert out.manager.center_name == "Margalla Dairy Center"
    assert out.manager.city == "Islamabad"
    stored = link_env._store["farmer_requests"][0]
    assert stored["farmer_id"] == "prof-farmer-1"
    assert stored["area_manager_id"] == "am-isb-1"


def test_create_request_unknown_manager_404_shape(link_env):
    with pytest.raises(ManagerNotFoundError):
        linking_service.create_manager_request("prof-farmer-1", "no-such", None)


def test_create_second_pending_is_duplicate(link_env):
    """One open request per farmer: a second pending insert is rejected."""
    linking_service.create_manager_request("prof-farmer-1", "am-isb-1", None)
    with pytest.raises(DuplicateRequestError):
        linking_service.create_manager_request("prof-farmer-1", "am-lhr-1", None)


def test_create_after_accepted_is_already_linked(link_env):
    """An accepted request blocks any new request (exclusive)."""
    _seed_request(link_env._store, status="accepted")
    with pytest.raises(AlreadyLinkedError):
        linking_service.create_manager_request("prof-farmer-1", "am-lhr-1", None)


def test_create_after_rejected_is_allowed(link_env):
    """Rejected/cancelled/ended are not open: a new request may be sent."""
    _seed_request(link_env._store, status="rejected")
    out = linking_service.create_manager_request("prof-farmer-1", "am-lhr-1", None)
    assert out.status == "pending"


def test_create_unique_violation_race_maps_to_duplicate(link_env, monkeypatch):
    """A 23505 between pre-check and insert maps to DuplicateRequestError."""

    class _UniqueViolation(Exception):
        code = "23505"

    real_table = linking_service.table

    class _InsertBoom:
        """Query proxy whose insert() raises a 23505 unique violation."""

        def __init__(self, q):
            self._q = q

        def insert(self, payload):
            raise _UniqueViolation("duplicate key value violates unique constraint")

        def __getattr__(self, name):
            return getattr(self._q, name)

    monkeypatch.setattr(
        linking_service,
        "table",
        lambda client, name: _InsertBoom(real_table(client, name))
        if name == "farmer_requests"
        else real_table(client, name),
        raising=False,
    )
    with pytest.raises(DuplicateRequestError):
        linking_service.create_manager_request("prof-farmer-1", "am-isb-1", None)


def test_get_latest_request_none_and_latest(link_env):
    """No request -> None; otherwise the latest row with manager info."""
    assert linking_service.get_latest_request("prof-farmer-1") is None
    _seed_request(
        link_env._store, id="req-old", status="rejected",
        created_at="2026-10-07T00:00:00+00:00",
    )
    _seed_request(
        link_env._store, id="req-new", status="pending",
        created_at="2026-10-08T00:00:00+00:00",
    )
    out = linking_service.get_latest_request("prof-farmer-1")
    assert out is not None and out.id == "req-new"
    assert out.manager is not None and out.manager.center_name == "Margalla Dairy Center"


def test_cancel_pending_ok_and_idempotent_404(link_env):
    out = linking_service.create_manager_request("prof-farmer-1", "am-isb-1", None)
    cancelled = linking_service.cancel_manager_request("prof-farmer-1")
    assert cancelled.id == out.id
    assert cancelled.status == "cancelled"
    with pytest.raises(NoPendingRequestError):
        linking_service.cancel_manager_request("prof-farmer-1")


# --- manager service ---


def test_manager_list_pending_scoped_with_farmer_info(link_env):
    """Only my center's pending requests, with joined farmer info."""
    _seed_request(link_env._store, id="req-mine", farmer_id="prof-farmer-1",
                  area_manager_id="am-isb-1", status="pending", note="salam")
    _seed_request(link_env._store, id="req-other", farmer_id="prof-farmer-2",
                  area_manager_id="am-lhr-1", status="pending")
    _seed_request(link_env._store, id="req-acc", farmer_id="prof-farmer-2",
                  area_manager_id="am-isb-1", status="accepted")
    rows = manager_service.list_pending_requests("am-isb-1")
    assert [r.id for r in rows] == ["req-mine"]
    farmer = rows[0].farmer
    assert farmer.full_name == "Allah Ditta"
    assert farmer.phone == "0333-4444444"
    assert farmer.city == "Islamabad"
    assert farmer.cattle_count == 8
    assert farmer.daily_litres == 25.5
    assert rows[0].note == "salam"


def test_manager_accept_links_farmers_row(link_env):
    """Accept: pending -> accepted, answered_at set, farmers.area_manager_id set."""
    _seed_request(link_env._store, id="req-1", status="pending")
    out = manager_service.accept_request("am-isb-1", "req-1")
    assert out.status == "accepted"
    assert out.farmer_row_linked is True
    stored = link_env._store["farmer_requests"][0]
    assert stored["status"] == "accepted"
    assert stored["answered_at"]
    farmers_row = _farmers_row(link_env._store)
    assert farmers_row["area_manager_id"] == "am-isb-1"


def test_manager_accept_foreign_center_is_404(link_env):
    """A request from another center is invisible to me."""
    _seed_request(link_env._store, id="req-x", area_manager_id="am-lhr-1",
                  status="pending")
    with pytest.raises(RequestNotFoundError):
        manager_service.accept_request("am-isb-1", "req-x")


def test_manager_accept_wrong_state_is_409(link_env):
    _seed_request(link_env._store, id="req-1", status="accepted")
    with pytest.raises(RequestStateError):
        manager_service.accept_request("am-isb-1", "req-1")


def test_manager_decline_sets_reason(link_env):
    _seed_request(link_env._store, id="req-1", status="pending")
    out = manager_service.decline_request("am-isb-1", "req-1", "center full")
    assert out.status == "rejected"
    assert out.farmer_row_linked is False
    stored = link_env._store["farmer_requests"][0]
    assert stored["reason"] == "center full"
    assert stored["answered_at"]
    # farmers row untouched
    assert _farmers_row(link_env._store)["area_manager_id"] is None


def test_manager_end_clears_link(link_env):
    _seed_request(link_env._store, id="req-1", status="accepted")
    _farmers_row(link_env._store)["area_manager_id"] = "am-isb-1"
    out = manager_service.end_linkage("am-isb-1", "req-1")
    assert out.status == "ended"
    assert out.farmer_row_linked is True
    stored = link_env._store["farmer_requests"][0]
    assert stored["status"] == "ended"
    assert stored["ended_at"]
    assert _farmers_row(link_env._store)["area_manager_id"] is None


def test_manager_end_non_accepted_is_409(link_env):
    _seed_request(link_env._store, id="req-1", status="pending")
    with pytest.raises(RequestStateError):
        manager_service.end_linkage("am-isb-1", "req-1")


# --- HTTP layer ---


def test_http_cities(api_client):
    resp = api_client.get("/api/v1/farmer/cities")
    assert resp.status_code == 200
    body = resp.json()
    assert body == sorted(body)
    assert "Islamabad" in body and "Lahore" in body


def test_http_managers_city_required(api_client):
    """Missing city -> 400 (not 422)."""
    resp = api_client.get("/api/v1/farmer/managers")
    assert resp.status_code == 400
    resp = api_client.get("/api/v1/farmer/managers?city=")
    assert resp.status_code == 400


def test_http_managers_by_city(api_client):
    resp = api_client.get("/api/v1/farmer/managers?city=islamabad")
    assert resp.status_code == 200
    body = resp.json()
    assert {m["id"] for m in body} == {"am-isb-1", "am-isb-2"}
    first = next(m for m in body if m["id"] == "am-isb-1")
    assert first["manager_name"] == "Kashif Mehmood"
    assert first["phone"] == "0300-1111111"


def test_http_request_lifecycle(api_client):
    """POST -> 201, GET shows it, second POST -> 409, DELETE cancels."""
    resp = api_client.post(
        "/api/v1/farmer/manager-request",
        json={"area_manager_id": "am-isb-1", "note": "please accept"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "pending"
    assert body["manager"]["center_name"] == "Margalla Dairy Center"

    resp = api_client.post(
        "/api/v1/farmer/manager-request", json={"area_manager_id": "am-lhr-1"}
    )
    assert resp.status_code == 409
    assert resp.json()["detail"] == "You already have an open registration request."

    resp = api_client.get("/api/v1/farmer/manager-request")
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"

    resp = api_client.delete("/api/v1/farmer/manager-request")
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"

    resp = api_client.get("/api/v1/farmer/manager-request")
    assert resp.json()["status"] == "cancelled"


def test_http_request_unknown_manager_404(api_client):
    resp = api_client.post(
        "/api/v1/farmer/manager-request", json={"area_manager_id": "nope"}
    )
    assert resp.status_code == 404


def test_http_request_note_too_long_422(api_client):
    resp = api_client.post(
        "/api/v1/farmer/manager-request",
        json={"area_manager_id": "am-isb-1", "note": "x" * 301},
    )
    assert resp.status_code == 422


def test_http_manager_flow(api_client, link_env):
    """Manager: list -> accept -> farmers row linked; decline/end paths."""
    _seed_request(link_env._store, id="req-1", farmer_id="prof-farmer-1",
                  area_manager_id="am-isb-1", status="pending", note="hi")

    resp = api_client.get("/api/v1/manager/requests")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["farmer"]["full_name"] == "Allah Ditta"
    assert body[0]["farmer"]["cattle_count"] == 8

    resp = api_client.post("/api/v1/manager/requests/req-1/accept")
    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"
    assert resp.json()["farmer_row_linked"] is True
    assert _farmers_row(link_env._store)["area_manager_id"] == "am-isb-1"

    # accept again -> 409 (no longer pending)
    resp = api_client.post("/api/v1/manager/requests/req-1/accept")
    assert resp.status_code == 409

    # end the linkage
    resp = api_client.post("/api/v1/manager/requests/req-1/end")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ended"
    assert _farmers_row(link_env._store)["area_manager_id"] is None


def test_http_manager_decline(api_client, link_env):
    _seed_request(link_env._store, id="req-9", status="pending")
    resp = api_client.post(
        "/api/v1/manager/requests/req-9/decline", json={"reason": "full"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


def test_http_manager_foreign_request_404(api_client, link_env):
    """Another center's request is invisible (404, not 403)."""
    _seed_request(link_env._store, id="req-z", area_manager_id="am-lhr-1",
                  status="pending")
    resp = api_client.post("/api/v1/manager/requests/req-z/accept")
    assert resp.status_code == 404
    resp = api_client.get("/api/v1/manager/requests")
    assert resp.json() == []
