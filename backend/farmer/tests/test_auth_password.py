# ApnaDairy — change-password / forgot-password endpoint tests.
# No network: the Supabase client is stubbed, JWT validation is stubbed.
# Verifies the REAL flow: current-password re-auth, admin password update,
# and the always-success forgot-password contract.

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_CALLS = {"signin": [], "updated": [], "reset": []}


class _FakeGoTrueAdmin:
    def update_user_by_id(self, uid, attrs):
        _CALLS["updated"].append((uid, attrs))
        return {"id": uid}


class _FakeGoTrue:
    def __init__(self, password_ok=True):
        self.admin = _FakeGoTrueAdmin()
        self._ok = password_ok

    def sign_in_with_password(self, creds):
        _CALLS["signin"].append(creds)
        if not self._ok or creds.get("password") != "correct-old":
            raise Exception("Invalid login credentials")
        return {"user": {"id": "auth-user-001"}}

    def reset_password_for_email(self, email):
        _CALLS["reset"].append(email)
        return {}


class _FakeClient:
    def __init__(self, password_ok=True):
        self.auth = _FakeGoTrue(password_ok)


def _claims_ok(token):
    if token != "good-token":
        raise HTTPException(status_code=401, detail="Invalid login token.")
    return {"sub": "auth-user-001", "email": "farmer@example.com"}


@pytest.fixture(autouse=True)
def _stubs(monkeypatch):
    _CALLS["signin"].clear()
    _CALLS["updated"].clear()
    _CALLS["reset"].clear()
    import app.api.v1.auth as auth_module
    import app.core.deps as deps_module

    monkeypatch.setattr(auth_module, "_fresh_web_client", lambda: _FakeClient())
    monkeypatch.setattr(
        auth_module, "get_web_client", lambda: _FakeClient(password_ok=False)
    )
    monkeypatch.setattr(deps_module, "validate_supabase_jwt", _claims_ok)
    yield


def _auth():
    return {"Authorization": "Bearer good-token"}


class TestChangePassword:
    def test_success_reauthenticates_then_updates(self):
        res = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "correct-old", "new_password": "brand-new-99"},
            headers=_auth(),
        )
        assert res.status_code == 200, res.text
        assert res.json() == {"changed": True}
        assert _CALLS["signin"] == [
            {"email": "farmer@example.com", "password": "correct-old"}
        ]
        assert _CALLS["updated"] == [("auth-user-001", {"password": "brand-new-99"})]

    def test_wrong_current_password_is_401_and_no_update(self):
        res = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "nope", "new_password": "brand-new-99"},
            headers=_auth(),
        )
        assert res.status_code == 401
        assert "current password is incorrect" in res.json()["detail"]
        assert _CALLS["updated"] == []

    def test_bad_token_is_401(self):
        res = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "correct-old", "new_password": "brand-new-99"},
            headers={"Authorization": "Bearer bad-token"},
        )
        assert res.status_code == 401
        assert _CALLS["signin"] == []

    def test_demo_token_is_401(self):
        res = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "x", "new_password": "brand-new-99"},
            headers={"Authorization": "Bearer demo-token-farmer-123"},
        )
        assert res.status_code == 401

    def test_short_new_password_is_422(self):
        res = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "correct-old", "new_password": "short"},
            headers=_auth(),
        )
        assert res.status_code == 422
        assert _CALLS["signin"] == []


class TestForgotPassword:
    def test_always_returns_sent(self):
        res = client.post(
            "/api/v1/auth/forgot-password", json={"email": "nobody@example.com"}
        )
        assert res.status_code == 200, res.text
        assert res.json() == {"sent": True}
        assert _CALLS["reset"] == ["nobody@example.com"]

    def test_backend_error_still_returns_sent(self):
        import app.api.v1.auth as auth_module

        class _Boom:
            @property
            def auth(self):
                raise AssertionError("unreachable")

        class _BoomClient:
            @property
            def auth(self):
                class _A:
                    def reset_password_for_email(self, email):
                        raise Exception("SMTP down")

                return _A()

        # Patch at call time: replace the module attr directly.
        orig = auth_module.get_web_client
        auth_module.get_web_client = lambda: _BoomClient()
        try:
            res = client.post(
                "/api/v1/auth/forgot-password", json={"email": "x@example.com"}
            )
        finally:
            auth_module.get_web_client = orig
        assert res.status_code == 200
        assert res.json() == {"sent": True}
