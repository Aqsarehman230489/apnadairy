# ApnaDairy — real auth tests (Supabase JWT + demo gating).
# No network: JWKS is injected, Supabase clients are faked (conftest),
# RSA keys are generated in-process.

import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core import deps
from app.core.security import reset_jwks_cache, validate_supabase_jwt
from app.main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Test RSA keys + token factory (stand-in for Supabase's JWKS)
# ---------------------------------------------------------------------------

_TEST_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_TEST_PUB = _TEST_KEY.public_key()
_OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_TEST_KID = "test-kid-1"
_TEST_JWKS = {_TEST_KID: _TEST_PUB}
_TEST_ISSUER = "https://test.supabase.co/auth/v1"


def _token(overrides=None, key=_TEST_KEY, kid=_TEST_KID):
    """Sign a Supabase-shaped access token."""
    now = int(time.time())
    claims = {
        "sub": "auth-user-001",
        "email": "farmer@example.com",
        "aud": "authenticated",
        "iss": _TEST_ISSUER,
        "iat": now,
        "exp": now + 3600,
        "role": "authenticated",
    }
    if overrides:
        claims.update(overrides)
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": kid} if kid else {})


@pytest.fixture(autouse=True)
def _auth_env(monkeypatch):
    """Point auth at a fake Supabase project; clear JWKS cache per test."""
    monkeypatch.setenv("SUPABASE_WEB_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_MOBILE_URL", "https://test.supabase.co")
    reset_jwks_cache()
    yield
    reset_jwks_cache()


def _validate(token):
    return validate_supabase_jwt(token, jwks_fetcher=lambda: _TEST_JWKS)


# ---------------------------------------------------------------------------
# 1. JWT validation (mocked JWKS)
# ---------------------------------------------------------------------------


class TestValidateSupabaseJwt:
    def test_valid_token_returns_claims(self):
        claims = _validate(_token())
        assert claims["sub"] == "auth-user-001"
        assert claims["email"] == "farmer@example.com"

    def test_expired_token_is_401(self):
        with pytest.raises(HTTPException) as ei:
            _validate(_token({"exp": int(time.time()) - 10}))
        assert ei.value.status_code == 401

    def test_bad_signature_is_401(self):
        with pytest.raises(HTTPException) as ei:
            _validate(_token(key=_OTHER_KEY))
        assert ei.value.status_code == 401

    def test_wrong_audience_is_401(self):
        with pytest.raises(HTTPException) as ei:
            _validate(_token({"aud": "someone-else"}))
        assert ei.value.status_code == 401

    def test_wrong_issuer_is_401(self):
        with pytest.raises(HTTPException) as ei:
            _validate(_token({"iss": "https://evil.example/auth/v1"}))
        assert ei.value.status_code == 401

    def test_missing_kid_is_401(self):
        with pytest.raises(HTTPException) as ei:
            _validate(_token(kid=None))
        assert ei.value.status_code == 401

    def test_unknown_kid_is_401(self):
        with pytest.raises(HTTPException) as ei:
            _validate(_token(kid="unknown-kid"))
        assert ei.value.status_code == 401

    def test_garbage_token_is_401(self):
        with pytest.raises(HTTPException) as ei:
            _validate("not-a-jwt")
        assert ei.value.status_code == 401

    def test_empty_token_is_401(self):
        with pytest.raises(HTTPException) as ei:
            _validate("")
        assert ei.value.status_code == 401


# ---------------------------------------------------------------------------
# 2. get_current_farmer — real path, demo fallback, gating
# ---------------------------------------------------------------------------


def _link_profile(fake, farmer_id="web-farmer-1", auth_user_id="auth-user-001"):
    """Seed the web rows the v2 auth flow reads: profiles + farmers.

    profiles.id IS the auth user id (1:1 link); farmers.profile_id points
    back at it. Mirrors what POST /api/v1/auth/signup writes.
    """
    fake._store.setdefault("profiles", []).append(
        {
            "id": auth_user_id,
            "full_name": "Test Farmer",
            "email": "test@example.com",
            "phone": "0300-0000000",
            "role": "farmer",
            "status": "active",
        }
    )
    fake._store.setdefault("farmers", []).append(
        {
            "id": farmer_id,
            "profile_id": auth_user_id,
            "area_manager_id": "mgr-1",
            "full_name": "Test Farmer",
            "phone": "0300-0000000",
            "village": "Chak 12",
            "is_active": True,
        }
    )


class TestGetCurrentFarmer:
    def test_demo_fallback_when_no_header_and_explicitly_enabled(self, monkeypatch):
        monkeypatch.setenv("AUTH_DEMO_ENABLED", "true")
        assert deps.get_current_farmer(authorization=None) == "farmer-001"

    def test_no_header_default_is_401_demo_impossible(self, monkeypatch):
        # Default (env unset): NO demo fallback — production-safe.
        monkeypatch.delenv("AUTH_DEMO_ENABLED", raising=False)
        with pytest.raises(HTTPException) as ei:
            deps.get_current_farmer(authorization=None)
        assert ei.value.status_code == 401

    def test_demo_fallback_uses_env_farmer(self, monkeypatch):
        monkeypatch.setenv("AUTH_DEMO_ENABLED", "true")
        monkeypatch.setenv("DEMO_FARMER_ID", "farmer-xyz")
        assert deps.get_current_farmer(authorization=None) == "farmer-xyz"

    def test_no_header_demo_disabled_is_401(self, monkeypatch):
        monkeypatch.setenv("AUTH_DEMO_ENABLED", "false")
        with pytest.raises(HTTPException) as ei:
            deps.get_current_farmer(authorization=None)
        assert ei.value.status_code == 401

    def test_valid_bearer_returns_linked_farmer_id(
        self, fake_supabase, monkeypatch
    ):
        _link_profile(fake_supabase)
        monkeypatch.setattr(
            "app.core.deps.validate_supabase_jwt",
            lambda token: {"sub": "auth-user-001"},
        )
        assert (
            deps.get_current_farmer(authorization="Bearer real.jwt.token")
            == "web-farmer-1"
        )

    def test_valid_bearer_without_profile_is_403(self, monkeypatch):
        monkeypatch.setattr(
            "app.core.deps.validate_supabase_jwt",
            lambda token: {"sub": "auth-user-unknown"},
        )
        with pytest.raises(HTTPException) as ei:
            deps.get_current_farmer(authorization="Bearer real.jwt.token")
        assert ei.value.status_code == 403

    def test_invalid_bearer_demo_enabled_falls_back(self, monkeypatch):
        monkeypatch.setenv("AUTH_DEMO_ENABLED", "true")

        def _boom(token):
            raise HTTPException(status_code=401, detail="Invalid login token.")

        monkeypatch.setattr("app.core.deps.validate_supabase_jwt", _boom)
        assert deps.get_current_farmer(authorization="Bearer bad") == "farmer-001"

    def test_invalid_bearer_demo_disabled_is_401(self, monkeypatch):
        monkeypatch.setenv("AUTH_DEMO_ENABLED", "false")

        def _boom(token):
            raise HTTPException(status_code=401, detail="Invalid login token.")

        monkeypatch.setattr("app.core.deps.validate_supabase_jwt", _boom)
        with pytest.raises(HTTPException) as ei:
            deps.get_current_farmer(authorization="Bearer bad")
        assert ei.value.status_code == 401

    def test_demo_auth_enabled_defaults_false(self, monkeypatch):
        monkeypatch.delenv("AUTH_DEMO_ENABLED", raising=False)
        assert deps.demo_auth_enabled() is False
        monkeypatch.setenv("AUTH_DEMO_ENABLED", "true")
        assert deps.demo_auth_enabled() is True


# ---------------------------------------------------------------------------
# 3. /auth/me — strict real-JWT endpoint (no demo fallback)
# ---------------------------------------------------------------------------


class TestAuthMe:
    def test_me_with_valid_bearer(self, fake_supabase, monkeypatch):
        _link_profile(fake_supabase)
        monkeypatch.setattr(
            "app.core.deps.validate_supabase_jwt",
            lambda token: {"sub": "auth-user-001", "email": "farmer@example.com"},
        )
        r = client.post("/api/v1/auth/me", headers={"Authorization": "Bearer x"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user_id"] == "auth-user-001"
        assert body["role"] == "farmer"
        assert body["status"] == "active"
        # profiles.status 'active' maps to the verified tri-state.
        assert body["verification"]["status"] == "verified"
        # The farmer is linked to the seeded center mgr-1.
        assert body["manager"] is not None
        assert body["manager"]["id"] == "mgr-1"

    def test_me_without_bearer_in_demo_returns_demo_farmer(self):
        # Demo mode (conftest sets AUTH_DEMO_ENABLED=true): /me falls back to
        # the demo farmer instead of 401 so the app is testable end-to-end.
        r = client.post("/api/v1/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "farmer"

    def test_me_without_bearer_is_401_when_demo_disabled(self, monkeypatch):
        monkeypatch.setenv("AUTH_DEMO_ENABLED", "false")
        r = client.post("/api/v1/auth/me")
        assert r.status_code == 401

    def test_me_unlinked_profile_is_404(self, monkeypatch):
        monkeypatch.setattr(
            "app.core.deps.validate_supabase_jwt",
            lambda token: {"sub": "auth-user-unknown"},
        )
        r = client.post("/api/v1/auth/me", headers={"Authorization": "Bearer x"})
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# 4. Demo endpoints are gated by AUTH_DEMO_ENABLED
# ---------------------------------------------------------------------------


class TestDemoGating:
    _LOGIN = {
        "identifier": "a@b.c",
        "password": "x",
        "role": "farmer",
    }
    _SIGNUP = {
        "name": "N",
        "email": "e@e.c",
        "phone": "0300",
        "password": "x",
        "role": "farmer",
    }

    def test_demo_login_works_when_explicitly_enabled(self, monkeypatch):
        monkeypatch.setenv("AUTH_DEMO_ENABLED", "true")
        r = client.post("/api/v1/auth/demo-login", json=self._LOGIN)
        assert r.status_code == 200, r.text

    def test_demo_login_default_is_403(self, monkeypatch):
        # Default (env unset): demo endpoints are closed — production-safe.
        monkeypatch.delenv("AUTH_DEMO_ENABLED", raising=False)
        r = client.post("/api/v1/auth/demo-login", json=self._LOGIN)
        assert r.status_code == 403

    def test_demo_login_disabled_is_403(self, monkeypatch):
        monkeypatch.setenv("AUTH_DEMO_ENABLED", "false")
        r = client.post("/api/v1/auth/demo-login", json=self._LOGIN)
        assert r.status_code == 403

    def test_demo_signup_disabled_is_403(self, monkeypatch):
        monkeypatch.setenv("AUTH_DEMO_ENABLED", "false")
        r = client.post("/api/v1/auth/demo-signup", json=self._SIGNUP)
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# 5. /auth/signup — Admin API + profile link row (stubbed Supabase client)
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# 5. /auth/signup — Admin API + web profiles row (fake Supabase client)
# ---------------------------------------------------------------------------


class _StubGoTrueAdmin:
    """Mimics client.auth.admin for create_user / delete_user."""

    def __init__(self, taken_emails=()):
        self.taken_emails = set(taken_emails)
        self.created = []
        self.deleted = []

    def create_user(self, attrs):
        if attrs["email"] in self.taken_emails:
            raise Exception("User already registered")
        self.created.append(attrs)
        return {"id": "auth-user-999", "email": attrs["email"]}

    def delete_user(self, uid):
        self.deleted.append(uid)


def _stub_auth_admin(fake, taken_emails=()):
    """Attach a stubbed .auth.admin to the conftest fake client."""
    admin = _StubGoTrueAdmin(taken_emails)
    fake.auth = type("A", (), {"admin": admin})()
    return admin


class TestRealSignup:
    _PAYLOAD = {
        "email": "new@example.com",
        "password": "secret123",
        "full_name": "New Farmer",
        "phone": "0300-1111111",
    }

    def test_signup_creates_user_and_profile_row(self, fake_supabase):
        admin = _stub_auth_admin(fake_supabase)
        r = client.post("/api/v1/auth/signup", json=self._PAYLOAD)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user_id"] == "auth-user-999"
        assert "pending verification" in body["message"]
        # Admin API got the right attributes (email auto-confirmed).
        assert admin.created[0]["email"] == "new@example.com"
        assert admin.created[0]["email_confirm"] is True
        assert admin.created[0]["user_metadata"]["role"] == "farmer"
        # Web profiles row links 1:1 on the auth user id.
        rows = [
            x
            for x in fake_supabase._store["profiles"]
            if x.get("id") == "auth-user-999"
        ]
        assert len(rows) == 1
        assert rows[0]["role"] == "farmer"
        assert rows[0]["status"] == "pending"

    def test_signup_taken_email_is_409(self, fake_supabase):
        _stub_auth_admin(fake_supabase, taken_emails={"taken@example.com"})
        r = client.post(
            "/api/v1/auth/signup",
            json=dict(self._PAYLOAD, email="taken@example.com"),
        )
        assert r.status_code == 409
        assert "already registered" in r.json()["detail"]

    def test_signup_taken_phone_is_409(self, fake_supabase):
        _stub_auth_admin(fake_supabase)
        fake_supabase._store["profiles"].append(
            {"id": "other-user", "phone": "0300-1111111"}
        )
        r = client.post("/api/v1/auth/signup", json=self._PAYLOAD)
        assert r.status_code == 409
        assert "phone" in r.json()["detail"].lower()

    def test_signup_profile_failure_cleans_up_user(self, fake_supabase, monkeypatch):
        admin = _stub_auth_admin(fake_supabase)
        orig_table = fake_supabase.table

        def _failing_table(name):
            q = orig_table(name)
            if name == "profiles":
                orig_exec = q.execute

                def _exec():
                    if q._op == "insert":
                        raise RuntimeError("db down")
                    return orig_exec()

                q.execute = _exec
            return q

        monkeypatch.setattr(fake_supabase, "table", _failing_table)
        r = client.post("/api/v1/auth/signup", json=self._PAYLOAD)
        assert r.status_code == 500
        assert admin.deleted == ["auth-user-999"]  # orphan cleanup attempted

    def test_signup_short_password_is_422(self):
        r = client.post(
            "/api/v1/auth/signup", json=dict(self._PAYLOAD, password="123")
        )
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# 6. /auth/google-link — ensure the Google-OAuth user has a web profiles row
# ---------------------------------------------------------------------------


class TestGoogleLink:
    def _patch(self, monkeypatch):
        monkeypatch.setattr(
            "app.core.deps.validate_supabase_jwt",
            lambda token: {"sub": "google-user-001", "email": "g@gmail.com"},
        )

    def test_link_creates_profiles_row(self, fake_supabase, monkeypatch):
        self._patch(monkeypatch)
        r = client.post(
            "/api/v1/auth/google-link",
            json={"full_name": "Google Farmer", "phone": "03001112222"},
            headers={"Authorization": "Bearer <redacted>"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["created"] is True
        assert body["user_id"] == "google-user-001"
        assert body["role"] == "farmer"
        # profiles.id IS the auth user id (1:1 link).
        rows = [
            x
            for x in fake_supabase._store["profiles"]
            if x.get("id") == "google-user-001"
        ]
        assert len(rows) == 1
        assert rows[0]["full_name"] == "Google Farmer"
        assert rows[0]["status"] == "pending"

    def test_link_is_idempotent(self, fake_supabase, monkeypatch):
        self._patch(monkeypatch)
        _link_profile(
            fake_supabase,
            farmer_id="google-user-001",
            auth_user_id="google-user-001",
        )
        r = client.post(
            "/api/v1/auth/google-link",
            json={"full_name": "Google Farmer", "phone": ""},
            headers={"Authorization": "Bearer <redacted>"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["created"] is False

    def test_link_without_bearer_is_401(self):
        r = client.post(
            "/api/v1/auth/google-link",
            json={"full_name": "No Token", "phone": ""},
        )
        assert r.status_code == 401

    def test_link_rejects_short_name(self, fake_supabase, monkeypatch):
        self._patch(monkeypatch)
        r = client.post(
            "/api/v1/auth/google-link",
            json={"full_name": "X", "phone": ""},
            headers={"Authorization": "Bearer <redacted>"},
        )
        assert r.status_code == 422
