# ApnaDairy — test doubles for Supabase.
# A tiny in-memory fake of the supabase-py query builder so the service
# layer can be tested WITHOUT a real Supabase project or network.
# Supports the chainable calls the services use:
#   table().select().insert().update().eq().in_().order().limit().execute()
#
# The web project is faked through ONE shared in-memory store. Web tables
# use real apnadairy-web columns (farmers, milk_collections, farmer_payouts,
# area_managers, profiles, farmer_profiles, farmer_requests); portal tables
# we own live in the same project (notifications, complaints).

import copy
import os
from datetime import datetime, timedelta, timezone

import pytest

# Tests must ALWAYS run against the fake farmer, even when a real backend/.env
# exists (load_dotenv in app.main must not override this).
os.environ["DEMO_FARMER_ID"] = "farmer-001"
# API-level tests exercise the HTTP stack without JWTs, so the explicit
# demo opt-in is enabled for the TEST environment only. Production default
# is "false" (see app/core/deps.py). deps-level tests in test_auth.py
# override this per-test with monkeypatch.
os.environ["AUTH_DEMO_ENABLED"] = "true"

# Every module that calls get_web_client() — patched per test so NO test
# touches the network or the live database. The auth router is included
# (signup / google-link / me / forgot-password all query the web project).
_SERVICE_MODULES = [
    # The client factory itself: some modules (onboarding_service,
    # sales_service) resolve the client INSIDE supabase_client.table(),
    # so patching only their own namespace would miss those calls and
    # hit the live database. Patching the factory covers every path.
    "app.db.supabase_client",
    "app.services.farmer.dashboard_service",
    "app.services.farmer.profile_service",
    "app.services.farmer.verification_service",
    "app.services.farmer.milk_service",
    "app.services.farmer.offer_service",
    "app.services.farmer.payment_service",
    "app.services.farmer.notification_service",
    "app.services.farmer.complaint_service",
    "app.services.farmer.manager_service",
    "app.services.farmer.linking_service",
    "app.services.farmer.onboarding_service",
    "app.services.farmer.sales_service",
    "app.api.v1.farmer.documents",
    "app.api.v1.auth",
    "app.core.deps",  # current_farmer/current_manager/get_current_farmer lookups
]


class _FakeResult:
    """Mimics supabase-py's execute() result (list-shaped .data)."""

    def __init__(self, data):
        self.data = data


class _FakeQuery:
    """Chainable in-memory query over one table's row list."""

    def __init__(self, table_name, store):
        self._table = table_name
        self._store = store
        self._filters = []      # list of (col, value) equality filters
        self._in_filters = []   # list of (col, [values]) filters
        self._order = None      # (col, desc)
        self._limit = None
        self._op = "select"
        self._payload = None

    # -- chainable verbs (each returns self, like supabase-py) --
    def select(self, cols="*"):
        return self

    def insert(self, data):
        self._op = "insert"
        self._payload = data
        return self

    def update(self, data):
        self._op = "update"
        self._payload = data
        return self

    def delete(self):
        self._op = "delete"
        return self

    def eq(self, col, value):
        self._filters.append((col, value))
        return self

    def in_(self, col, values):
        self._in_filters.append((col, list(values)))
        return self

    def order(self, col, desc=False):
        self._order = (col, desc)
        return self

    def limit(self, n):
        self._limit = n
        return self

    def single(self):
        self._limit = 1
        return self

    # -- helpers --
    def _rows(self):
        return self._store.setdefault(self._table, [])

    def _matches(self, row):
        for col, val in self._filters:
            if row.get(col) != val:
                return False
        for col, vals in self._in_filters:
            if row.get(col) not in vals:
                return False
        return True

    def execute(self):
        """Run the queued operation against the in-memory store."""
        rows = self._rows()
        if self._op == "insert":
            items = self._payload if isinstance(self._payload, list) else [self._payload]
            for item in items:
                item = dict(item)
                item.setdefault("id", f"fake-{len(rows) + 1:04d}")
                rows.append(item)
            return _FakeResult(items)
        if self._op == "update":
            matched = [r for r in rows if self._matches(r)]
            for r in matched:
                r.update(self._payload)
            return _FakeResult(matched)
        if self._op == "delete":
            kept = [r for r in rows if not self._matches(r)]
            removed = len(rows) - len(kept)
            self._store[self._table] = kept
            return _FakeResult([{"deleted": removed}])
        # select
        out = [r for r in rows if self._matches(r)]
        if self._order:
            col, desc = self._order
            out.sort(
                key=lambda r: (r.get(col) is None, str(r.get(col) or "")),
                reverse=desc,
            )
        if self._limit is not None:
            out = out[: self._limit]
        return _FakeResult(out)


class FakeSupabaseClient:
    """Stand-in for supabase.Client with per-test seed data."""

    def __init__(self, seed):
        # Deep-copy so tests never leak state into each other.
        self._store = copy.deepcopy(seed)
        self.storage = _FakeStorage()

    def table(self, name):
        return _FakeQuery(name, self._store)


class _FakeStorageBucket:
    """In-memory stand-in for one Supabase storage bucket."""

    def __init__(self, files):
        self._files = files  # dict path -> bytes

    def upload(self, path, data, options=None):
        """Store file bytes under path; mimics a successful upload."""
        self._files[path] = data
        return {"path": path}

    def create_signed_url(self, path, expires_in):
        """Return a fake signed URL for a stored path."""
        if path not in self._files:
            raise FileNotFoundError(path)
        return {"signedURL": f"https://fake.storage/{path}?exp={expires_in}"}

    def list(self, path=None):
        """List file names directly under a folder (supabase-py shape)."""
        prefix = (path or "").rstrip("/") + "/"
        names = set()
        for stored_path in self._files:
            if stored_path.startswith(prefix):
                rest = stored_path[len(prefix):]
                if "/" not in rest:
                    names.add(rest)
        return [{"name": name} for name in sorted(names)]


class _FakeStorage:
    """Stand-in for supabase.Client.storage."""

    def __init__(self):
        self._files = {}

    def from_(self, bucket):
        """Return the in-memory bucket handle (bucket name ignored in tests)."""
        return _FakeStorageBucket(self._files)


def _now():
    """Current UTC time (timezone-aware)."""
    return datetime.now(timezone.utc)


def seed_store() -> dict:
    """Canned rows for web + mobile tables (real column names).

    Web collection dates are built relative to the current month so the
    dashboard's "this month" filter always includes them.
    """
    now = _now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def day(n: int) -> str:
        """ISO timestamp n days into the current month."""
        return (month_start + timedelta(days=n)).isoformat()

    return {
        # ---- WEB project (apnadairy-web, read-only) ----
        "farmers": [
            {
                "id": "farmer-001",
                "area_manager_id": "mgr-1",
                "profile_id": "prof-1",
                "full_name": "Muhammad Ramzan",
                "phone": "0333-1234567",
                "village": "Chak 12",
                "milk_type": "buffalo",
                "cattle_count": 12,
                "is_active": True,
                "created_at": day(0),
            }
        ],
        "area_managers": [
            {
                "id": "mgr-1",
                "user_id": "user-mgr-1",
                "center_name": "Bilal Traders",
                "type": "dairy",
            }
        ],
        "profiles": [
            {
                "id": "user-mgr-1",
                "full_name": "Bilal Ahmed",
                "email": "bilal@example.com",
                "phone": "0301-1111111",
                "role": "manager",
                "status": "active",
            }
        ],
        "milk_collections": [
            {
                "id": "mc-1",
                "area_manager_id": "mgr-1",
                "farmer_id": "farmer-001",
                "milk_type": "buffalo",
                "shift": "morning",
                "quantity_l": 20.0,
                "collected_at": day(1),
                "temperature_c": 4.2,
                "ph": 6.62,
                "ec_ms": 4.10,
                "test_source": "iot",
                "device_serial": "DEV-01",
                "quality": "A",
                "freshness_hours": 36,
                "status": "accepted",
                "total_amount": 3600.0,
            },
            {
                "id": "mc-2",
                "area_manager_id": "mgr-1",
                "farmer_id": "farmer-001",
                "milk_type": "buffalo",
                "shift": "evening",
                "quantity_l": 40.0,
                "collected_at": day(2),
                "temperature_c": 4.5,
                "ph": 6.60,
                "ec_ms": 4.05,
                "test_source": "iot",
                "device_serial": "DEV-01",
                "quality": "A",
                "freshness_hours": 30,
                "status": "accepted",
                "total_amount": 7200.0,
            },
            {
                "id": "mc-3",
                "area_manager_id": "mgr-1",
                "farmer_id": "farmer-001",
                "milk_type": "buffalo",
                "shift": "morning",
                "quantity_l": 25.0,
                "collected_at": day(3),
                "temperature_c": 5.1,
                "ph": 6.55,
                "ec_ms": 3.95,
                "test_source": "manual",
                "device_serial": None,
                "quality": "B",
                "freshness_hours": 24,
                "status": "accepted",
                "total_amount": 4300.0,
            },
        ],
        "farmer_payouts": [
            {
                "id": "PAY-1",
                "area_manager_id": "mgr-1",
                "farmer_id": "farmer-001",
                "amount": 3600.0,
                "status": "PAID",
                "receipt_no": "PUR-2081",
                "farmer_note": None,
                "created_at": day(2),
                "answered_at": day(2),
                "is_sample": False,
            },
            {
                "id": "PAY-2",
                "area_manager_id": "mgr-1",
                "farmer_id": "farmer-001",
                "amount": 7200.0,
                "status": "PAID",
                "receipt_no": "PUR-2079",
                "farmer_note": None,
                "created_at": day(1),
                "answered_at": day(1),
                "is_sample": False,
            },
            {
                "id": "PAY-3",
                "area_manager_id": "mgr-1",
                "farmer_id": "farmer-001",
                "amount": 4300.0,
                "status": "PENDING",
                "receipt_no": "PUR-2076",
                "farmer_note": None,
                "created_at": day(3),
                "answered_at": None,
                "is_sample": False,
            },
        ],
        # ---- MOBILE project (portal tables we own) ----
        "milk_requests": [
            {
                "id": "MR-AAA111",
                "farmer_id": "farmer-001",
                "manager_id": "mgr-1",
                "litres": 20.0,
                "status": "OFFERED",
                "created_at": day(4),
            },
            {
                "id": "MR-BBB222",
                "farmer_id": "farmer-001",
                "manager_id": "mgr-1",
                "litres": 15.0,
                "status": "SENT",
                "created_at": day(5),
            },
        ],
        "offers": [
            {
                "id": "OF-1001",
                "request_id": "MR-AAA111",
                "farmer_id": "farmer-001",
                "manager_id": "mgr-1",
                "litres": 20.0,
                "temperature": 6.2,
                "ph": 6.7,
                "tds": 720.0,
                "ec": 1.12,
                "ai_score": 92.0,
                "ai_category": "A",
                "price_per_litre": 180.0,
                "total_amount": 3600.0,
                "status": "PENDING",
                "expires_at": "2099-01-01T00:00:00+00:00",
                "created_at": day(4),
            },
            {
                "id": "OF-1002",  # past expiry -> must read as EXPIRED
                "request_id": "MR-AAA111",
                "farmer_id": "farmer-001",
                "manager_id": "mgr-1",
                "litres": 10.0,
                "temperature": 7.0,
                "ph": 6.5,
                "tds": 700.0,
                "ec": 1.10,
                "ai_score": 80.0,
                "ai_category": "B",
                "price_per_litre": 170.0,
                "total_amount": 1700.0,
                "status": "PENDING",
                "expires_at": "2000-01-01T00:00:00+00:00",
                "created_at": day(3),
            },
        ],
        "farmer_verifications": [
            {
                "farmer_id": "farmer-001",
                "status": "APPROVED",
                "rejection_reason": None,
                "updated_at": day(1),
            }
        ],
        "farmer_documents": [
            {
                "id": "doc-0001",
                "farmer_id": "farmer-001",
                "doc_type": "cnic_front",
                "file_path": "farmer-001/cnic_front.jpg",
                "status": "APPROVED",
                "rejection_reason": None,
            }
        ],
        "notifications": [
            {
                "id": "NTF-1",
                "user_id": "prof-1",
                "title": "Payment received",
                "body": "Rs 3,600 received for PUR-2081.",
                "kind": "payment",
                "link": "/payments/PAY-1",
                "read_at": None,
                "created_at": day(2),
            },
            {
                "id": "NTF-2",
                "user_id": "prof-1",
                "title": "New offer",
                "body": "Offer OF-1001 is waiting for your decision.",
                "kind": "offer",
                "link": "/milk/offer-detail?id=OF-1001",
                "read_at": day(1),
                "created_at": day(1),
            },
        ],
        "complaints": [
            {
                "id": "CMP-001",
                "farmer_id": "farmer-001",
                "category": "payment",
                "message": "Payment for PUR-2076 is delayed by 3 days.",
                "photo_url": None,
                "status": "IN_REVIEW",
                "admin_reply": None,
                "created_at": day(2),
            }
        ],
    }


@pytest.fixture(autouse=True)
def fake_supabase(monkeypatch):
    """Patch get_web_client()/get_mobile_client() in every farmer module.

    Runs automatically for every test — no test touches the network.
    Both clients return the same in-memory fake (table names do not collide
    across the two projects). Yields the fake so tests can inspect/mutate
    the seeded store.
    """
    fake = FakeSupabaseClient(seed_store())
    for module in _SERVICE_MODULES:
        monkeypatch.setattr(
            f"{module}.get_web_client", lambda _f=fake: _f, raising=False
        )
        monkeypatch.setattr(
            f"{module}.get_mobile_client", lambda _f=fake: _f, raising=False
        )
    yield fake
