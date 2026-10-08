# ApnaDairy — tests for the farmer assistant endpoint.
# Same stack as tests/test_farmer_api.py: conftest's autouse fake_supabase
# fixture and AUTH_DEMO_ENABLED give zero-network tests with demo auth.

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _ask(message: str):
    return client.post("/api/v1/farmer/assistant", json={"message": message})


def test_price_question_mentions_formula():
    """The price answer states the discount formula and the score-95 example."""
    resp = _ask("How is the price calculated?")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "max(5, (100 - score) * 2)" in body["reply"]
    assert "Rs 198" in body["reply"]
    assert 2 <= len(body["suggestions"]) <= 4


def test_manager_registration_mentions_exclusive():
    """Registration answer says the farmer requests ONE manager and sells
    only to that manager."""
    resp = _ask("How do I register with an area manager?")
    assert resp.status_code == 200, resp.text
    reply = resp.json()["reply"]
    assert "ONE manager" in reply
    assert "only to that manager" in reply


def test_greeting_returns_greeting_and_suggestions():
    """A greeting identifies ApnaDairy Assistant and offers follow-ups."""
    resp = _ask("hello")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "ApnaDairy Assistant" in body["reply"]
    assert 2 <= len(body["suggestions"]) <= 4


def test_salam_greeting():
    """The Roman-Urdu greeting is recognised as a greeting."""
    resp = _ask("salam")
    assert resp.status_code == 200, resp.text
    assert "ApnaDairy Assistant" in resp.json()["reply"]


def test_unknown_topic_returns_fallback():
    """An unrelated question gets the honest scope-limited fallback."""
    resp = _ask("What is the capital of France?")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "I can only answer questions about using the ApnaDairy farmer app" in body["reply"]
    assert 2 <= len(body["suggestions"]) <= 4


def test_empty_message_returns_422():
    """An empty message fails pydantic validation (min_length=1)."""
    resp = _ask("")
    assert resp.status_code == 422, resp.text


def test_overlong_message_returns_422():
    """A 501-char message fails pydantic validation (max_length=500)."""
    resp = _ask("x" * 501)
    assert resp.status_code == 422, resp.text


def test_whitespace_only_message_returns_scope_reply():
    """Whitespace-only input is stripped; the assistant asks for a question."""
    resp = _ask("   ")
    assert resp.status_code == 200, resp.text
    assert "Please type a question" in resp.json()["reply"]


def test_daily_sale_answer_covers_manager_flow():
    """The sale answer covers manager selection, IoT test, both-party price,
    offer accept/refuse, and batch creation."""
    resp = _ask("How do I sell my milk daily?")
    assert resp.status_code == 200, resp.text
    reply = resp.json()["reply"]
    assert "manager" in reply.lower()
    assert "IoT" in reply
    assert "BOTH" in reply
    assert "batch" in reply.lower()


def test_verification_answer_covers_superadmin_scope():
    """The verification answer covers CNIC photos, 24-48 hours, and the
    SuperAdmin's sales-excluded role."""
    resp = _ask("What does verification involve?")
    assert resp.status_code == 200, resp.text
    reply = resp.json()["reply"]
    assert "CNIC" in reply
    assert "24-48 hours" in reply
    assert "NO role in milk sales" in reply


def test_deterministic_matching_best_score_wins():
    """Keywords from two topics: the topic with more hits wins; 'score' +
    'price' + 'formula' should pick the AI price answer."""
    resp = _ask("How is the milk price formula computed from the score?")
    assert resp.status_code == 200, resp.text
    assert "discount_pct" in resp.json()["reply"]
