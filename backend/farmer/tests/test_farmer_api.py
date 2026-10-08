# ApnaDairy — API tests for the farmer routers (REAL web-schema code path).
# The autouse fake_supabase fixture (conftest.py) patches every module's
# get_web_client(), so these tests run with zero network. Demo auth is
# enabled for the TEST environment only (conftest sets AUTH_DEMO_ENABLED),
# so the HTTP stack is exercised without JWTs; JWT validation itself is
# covered in test_auth.py / test_auth_password.py.
#
# The v1 milk-requests / offers endpoints are gone — the manager-driven
# sale flow is covered in tests/test_sales.py.

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# --- profile (web farmers row + farmer_profiles override, real columns) ---
def test_profile_read_and_update():
    """GET profile returns the seeded web row; PUT personal updates full_name."""
    resp = client.get("/api/v1/farmer/profile/")
    assert resp.status_code == 200, resp.text
    assert resp.json()["name"] == "Muhammad Ramzan"
    assert resp.json()["village"] == "Chak 12"
    assert resp.json()["verification_status"] == "APPROVED"

    resp = client.put("/api/v1/farmer/profile/personal", json={"name": "Ramzan Ali"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["name"] == "Ramzan Ali"

    # Farm partial update: village lands in the override row; the web
    # farmers table has no city column, so city stays null.
    resp = client.put("/api/v1/farmer/profile/farm", json={"village": "Chak 99"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["village"] == "Chak 99"
    assert body["city"] is None
    # The personal override from the earlier PUT is still merged in.
    assert body["name"] == "Ramzan Ali"


# --- onboarding (web farmer_profiles upsert + farmers registry row) ---
def test_onboarding_submit_and_status():
    """POST onboarding saves the profile; verification stays pending until SuperAdmin."""
    resp = client.post(
        "/api/v1/farmer/onboarding",
        json={
            "city": "Islamabad",
            "village": "Chak 12",
            "farm_name": "Ramzan Dairy Farm",
            "milk_type": "buffalo",
            "cattle_count": 12,
            "daily_litres": 40.0,
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["city"] == "Islamabad"
    assert body["cattle_count"] == 12

    # Not verified yet: no verified_at, no rejection reason.
    resp = client.get("/api/v1/farmer/verification-status")
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "pending"

    # A second submit upserts (no duplicate row).
    resp = client.post(
        "/api/v1/farmer/onboarding",
        json={"city": "Rawalpindi", "cattle_count": 14},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["city"] == "Rawalpindi"
    assert resp.json()["cattle_count"] == 14


def test_onboarding_city_required():
    """City is required: blank/missing city is a 422."""
    resp = client.post("/api/v1/farmer/onboarding", json={"city": " "})
    assert resp.status_code == 422
    resp = client.post("/api/v1/farmer/onboarding", json={})
    assert resp.status_code == 422


# --- verification status (read-only, SuperAdmin decides) ---
def test_verification_status_transitions(fake_supabase):
    """pending -> verified / rejected derive from the farmer_profiles row."""
    resp = client.get("/api/v1/farmer/verification-status")
    assert resp.json()["status"] == "pending"

    fake_supabase._store.setdefault("farmer_profiles", []).append(
        {"user_id": "prof-1", "verified_at": "2026-10-08T00:00:00+00:00"}
    )
    resp = client.get("/api/v1/farmer/verification-status")
    assert resp.json()["status"] == "verified"

    fake_supabase._store["farmer_profiles"][0] = {
        "user_id": "prof-1",
        "rejection_reason": "CNIC photo is blurry",
    }
    resp = client.get("/api/v1/farmer/verification-status")
    body = resp.json()
    assert body["status"] == "rejected"
    assert body["rejection_reason"] == "CNIC photo is blurry"


# --- payments (web farmer_payouts, real columns) ---
def test_payments_list_and_detail():
    """List newest-first; detail carries the farmer note; unknown id is 404."""
    resp = client.get("/api/v1/farmer/payments")
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    assert len(rows) == 3
    # Newest first by created_at: PAY-3 (day 3), PAY-1 (day 2), PAY-2 (day 1).
    assert [r["id"] for r in rows] == ["PAY-3", "PAY-1", "PAY-2"]
    assert rows[1]["receipt_no"] == "PUR-2081"
    assert rows[1]["amount"] == 3600.0

    resp = client.get("/api/v1/farmer/payments/PAY-1")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "PAID"
    assert body["farmer_note"] is None
    assert body["collections_count"] == 0

    resp = client.get("/api/v1/farmer/payments/PAY-999")
    assert resp.status_code == 404


# --- notifications (web project) ---
def test_notifications_list_and_mark_read():
    """List newest-first; mark_read counts only newly-marked rows."""
    resp = client.get("/api/v1/farmer/notifications")
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    assert [r["id"] for r in rows] == ["NTF-1", "NTF-2"]

    resp = client.post("/api/v1/farmer/notifications/read", json={"ids": ["NTF-1", "NTF-2"]})
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"marked": 1}  # NTF-2 was already read

    resp = client.get("/api/v1/farmer/notifications")
    assert all(r["read"] for r in resp.json())


# --- complaints (web project) ---
def test_complaints_flow():
    """List -> create (201, OPEN) -> detail; unknown id is 404."""
    resp = client.get("/api/v1/farmer/complaints")
    assert resp.status_code == 200, resp.text
    assert len(resp.json()) == 1

    resp = client.post(
        "/api/v1/farmer/complaints",
        json={"category": "payment", "message": "Payment for PUR-2076 is delayed by 3 days."},
    )
    assert resp.status_code == 201, resp.text
    new_id = resp.json()["id"]
    assert resp.json()["status"] == "OPEN"
    assert resp.json()["admin_reply"] is None

    resp = client.get(f"/api/v1/farmer/complaints/{new_id}")
    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == new_id

    resp = client.get("/api/v1/farmer/complaints/CMP-999")
    assert resp.status_code == 404

    # Short messages are rejected by schema validation (422).
    resp = client.post(
        "/api/v1/farmer/complaints",
        json={"category": "app", "message": "too short"},
    )
    assert resp.status_code == 422


# --- managers browse (linking: city is required) ---
def test_managers_browse_by_city(fake_supabase):
    """City query param is required; managers come with person details."""
    resp = client.get("/api/v1/farmer/managers")
    assert resp.status_code == 400

    resp = client.get("/api/v1/farmer/managers", params={"city": "Nowhere"})
    assert resp.status_code == 200, resp.text
    assert resp.json() == []

    fake_supabase._store["area_managers"].append(
        {
            "id": "am-test-1",
            "user_id": "user-mgr-1",
            "center_name": "Test Dairy Center",
            "address": "Main Road",
            "city": "Islamabad",
        }
    )
    resp = client.get("/api/v1/farmer/managers", params={"city": "islamabad"})
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["id"] == "am-test-1"
    # Name/phone join via area_managers.user_id -> profiles.
    assert rows[0]["manager_name"] == "Bilal Ahmed"
    assert rows[0]["phone"] == "0301-1111111"


def test_cities_lists_manager_cities(fake_supabase):
    """GET /cities returns distinct sorted cities."""
    fake_supabase._store["area_managers"].append(
        {"id": "am-c-1", "center_name": "C1", "city": "Lahore"}
    )
    fake_supabase._store["area_managers"].append(
        {"id": "am-c-2", "center_name": "C2", "city": "Islamabad"}
    )
    resp = client.get("/api/v1/farmer/cities")
    assert resp.status_code == 200, resp.text
    cities = resp.json()
    assert cities == sorted(cities)
    assert "Islamabad" in cities and "Lahore" in cities


# --- documents (private web storage bucket) ---
def test_documents_list_and_upload(fake_supabase):
    """List shows the four kinds (null until uploaded); upload stores the file."""
    resp = client.get("/api/v1/farmer/documents")
    assert resp.status_code == 200, resp.text
    rows = {r["kind"]: r["path"] for r in resp.json()}
    assert set(rows) == {"cnic_front", "cnic_back", "profile_photo", "farm_photo"}
    assert all(v is None for v in rows.values())

    resp = client.post(
        "/api/v1/farmer/documents",
        data={"kind": "cnic_front"},
        files={"file": ("cnic.jpg", b"fake-image-bytes", "image/jpeg")},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["kind"] == "cnic_front"
    assert body["path"] == "prof-1/cnic_front.jpg"

    resp = client.get("/api/v1/farmer/documents")
    rows = {r["kind"]: r["path"] for r in resp.json()}
    assert rows["cnic_front"] == "prof-1/cnic_front.jpg"
    assert rows["cnic_back"] is None

    # Unknown kind and empty file are rejected.
    resp = client.post(
        "/api/v1/farmer/documents",
        data={"kind": "passport"},
        files={"file": ("p.jpg", b"x", "image/jpeg")},
    )
    assert resp.status_code == 422
    resp = client.post(
        "/api/v1/farmer/documents",
        data={"kind": "cnic_back"},
        files={"file": ("b.jpg", b"", "image/jpeg")},
    )
    assert resp.status_code == 422


# --- demo auth bridge ---
def test_demo_auth_login_and_signup(monkeypatch):
    """Demo login/signup return sessions for the demo farmer (explicit opt-in)."""
    monkeypatch.setenv("AUTH_DEMO_ENABLED", "true")
    resp = client.post(
        "/api/v1/auth/demo-login",
        json={"identifier": "naseem@demo.pk", "password": "demo123", "role": "farmer"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "farmer"
    assert resp.json()["is_new_user"] is False
    assert resp.json()["token"].startswith("demo-token-")

    resp = client.post(
        "/api/v1/auth/demo-login",
        json={"identifier": "x", "password": "wrong", "role": "farmer"},
    )
    assert resp.status_code == 401

    resp = client.post(
        "/api/v1/auth/demo-signup",
        json={"name": "T", "email": "t@t.pk", "phone": "0300", "password": "p", "role": "farmer"},
    )
    assert resp.status_code == 200
    assert resp.json()["is_new_user"] is True
