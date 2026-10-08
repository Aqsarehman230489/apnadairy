# ApnaDairy — deterministic assistant (FAQ chatbot) service.
# Pure function: lowercase keyword scoring over an in-code English knowledge
# base. No network, no model call, fully deterministic. The assistant
# identifies as "ApnaDairy Assistant", a built-in help guide — never as a
# generative AI. Topic answers mirror the real product: exclusive manager
# model, manager-driven daily sales, the AI price discount formula, and the
# SuperAdmin profile-only verification.

from __future__ import annotations

import re


def _matches(text: str, keyword: str) -> bool:
    """Word-boundary match so short keywords like "hi" cannot match inside
    other words (e.g. "this", "which")."""
    return re.search(r"\b" + re.escape(keyword) + r"\b", text) is not None


def _answer_identity() -> tuple[str, list[str]]:
    reply = (
        "I am ApnaDairy Assistant, the built-in help guide in this farmer app. "
        "I can answer questions about using the app: registering with an area "
        "manager, selling your daily milk, how the AI price works, payments, "
        "verification, complaints, and your profile."
    )
    return reply, [
        "How do I register with an area manager?",
        "How do I sell my milk?",
        "How is the price calculated?",
    ]


def _answer_greeting() -> tuple[str, list[str]]:
    reply = (
        "Hello! I am ApnaDairy Assistant, here to help you use the farmer app. "
        "You can ask me how to register with an area manager, how daily milk "
        "selling works, how the AI price is calculated, or how payments and "
        "complaints work."
    )
    return reply, [
        "How do I register with an area manager?",
        "How do I sell my milk?",
        "How do I check my payments?",
    ]


def _answer_manager_registration() -> tuple[str, list[str]]:
    reply = (
        "To start selling, you register with exactly one area manager. "
        "Pick your city, and the app shows the area managers for that city. "
        "Send a registration request to ONE manager, and wait for the manager "
        "to accept. The relationship is exclusive: once accepted, you sell "
        "your daily milk only to that manager."
    )
    return reply, [
        "How do I sell my milk?",
        "How is the price calculated?",
        "What does verification involve?",
    ]


def _answer_daily_sale() -> tuple[str, list[str]]:
    reply = (
        "Selling milk is manager-driven. Each day, your area manager selects "
        "you and runs the milk test with the IoT device. The live sensor data, "
        "the AI freshness score, and the AI price are shown to BOTH you and the "
        "manager. The manager then sends you an offer, and you accept or refuse "
        "it with one tap. Every accepted sale automatically creates a batch "
        "under the manager, and your quantity is recorded."
    )
    return reply, [
        "How is the price calculated?",
        "How do I check my payments?",
        "How do I register with an area manager?",
    ]


def _answer_ai_price() -> tuple[str, list[str]]:
    reply = (
        "The AI price is computed from the AI freshness score with this "
        "formula: discount_pct = max(5, (100 - score) * 2). The discount is "
        "applied below the current market rate. Example: a freshness score of "
        "95 gives a 10% discount, so a Rs 220 market rate becomes about Rs 198. "
        "A lower score means a bigger discount, down to a minimum discount of "
        "5%. The final price is shown to both you and the manager before the "
        "offer is sent."
    )
    return reply, [
        "How do I sell my milk?",
        "What does the freshness score mean?",
        "How do I check my payments?",
    ]


def _answer_freshness() -> tuple[str, list[str]]:
    reply = (
        "The AI freshness score comes from the manager's IoT device test of "
        "your milk. The device measures temperature, pH, TDS, and electrical "
        "conductivity (EC), and the AI combines those readings into a score. "
        "A higher score means fresher milk, and the score sets your price "
        "through the discount formula: discount_pct = max(5, (100 - score) * 2)."
    )
    return reply, [
        "How is the price calculated?",
        "How do I sell my milk?",
        "How do I register with an area manager?",
    ]


def _answer_verification() -> tuple[str, list[str]]:
    reply = (
        "Verification is a one-time step. Submit your personal and farm details "
        "with your CNIC photos in the verification section. A SuperAdmin "
        "reviews your profile only — this usually takes 24-48 hours. The "
        "SuperAdmin has NO role in milk sales; sales are only between you and "
        "your area manager. Once verified, you can register with a manager "
        "and start selling."
    )
    return reply, [
        "How do I register with an area manager?",
        "How do I sell my milk?",
        "How do I check my payments?",
    ]


def _answer_payments() -> tuple[str, list[str]]:
    reply = (
        "You are paid for every accepted sale. Each sale gets a receipt number, "
        "and you can see it as PENDING until the money reaches you, then "
        "RECEIVED. Your full payment history — every receipt, amount, date, "
        "and status — is in the Payments tab."
    )
    return reply, [
        "How do I sell my milk?",
        "How is the price calculated?",
        "How do I file a complaint?",
    ]


def _answer_complaints() -> tuple[str, list[str]]:
    reply = (
        "If something goes wrong, file a complaint from the Complaints tab: "
        "choose a category, describe the problem, and submit. You can track the "
        "status of each complaint there, and the admin team replies to it."
    )
    return reply, [
        "How do I check my payments?",
        "How do I sell my milk?",
        "How do I register with an area manager?",
    ]


def _answer_profile() -> tuple[str, list[str]]:
    reply = (
        "Your Profile tab holds your personal and farm details — name, phone, "
        "village, city, animal count, and your document uploads. You can edit "
        "your details there at any time. Changing some details may require "
        "re-verification, so the app will tell you if that happens."
    )
    return reply, [
        "What does verification involve?",
        "How do I register with an area manager?",
        "How do I check my payments?",
    ]


def _answer_notifications() -> tuple[str, list[str]]:
    reply = (
        "The Notifications tab shows updates from your manager: new offers, "
        "accepted sales, payment updates, and manager messages. Check it "
        "regularly — offers arrive there, and you accept or refuse them with "
        "one tap."
    )
    return reply, [
        "How do I sell my milk?",
        "How do I check my payments?",
        "How is the price calculated?",
    ]


def _answer_fallback() -> tuple[str, list[str]]:
    reply = (
        "I can only answer questions about using the ApnaDairy farmer app, "
        "such as registering with an area manager, selling milk, the AI "
        "price, payments, verification, and complaints. Please ask about one "
        "of those topics."
    )
    return reply, [
        "How do I register with an area manager?",
        "How do I sell my milk?",
        "How is the price calculated?",
        "How do I check my payments?",
    ]


# (topic handler, keyword list). Order is the tie-break: earlier wins.
_TOPICS: list[tuple] = [
    (_answer_identity, ["who are you", "your name", "what are you", "about you", "assistant"]),
    (_answer_greeting, ["hello", "hi", "hey", "salam", "good morning", "good evening", "good afternoon"]),
    (_answer_manager_registration, ["register", "registration", "registered", "sign up", "signup", "manager", "join", "one manager", "exclusive"]),
    (_answer_daily_sale, ["sell", "selling", "sale", "sales", "daily milk", "milk", "offer", "accept", "refuse", "batch", "iot", "test"]),
    (_answer_ai_price, ["price", "pricing", "rate", "formula", "discount", "cost", "rs", "rupee", "how much", "discount_pct"]),
    (_answer_freshness, ["freshness", "score", "quality", "ph", "tds", "conductivity", "ec", "temperature", "sensor"]),
    (_answer_verification, ["verification", "verify", "verified", "cnic", "approve", "approved", "superadmin", "super admin", "document", "documents", "kyc"]),
    (_answer_payments, ["payment", "payments", "paid", "payout", "money", "receipt", "pending", "received", "earn", "dues"]),
    (_answer_complaints, ["complaint", "complaints", "problem", "issue", "wrong", "report", "grievance"]),
    (_answer_profile, ["profile", "personal", "farm details", "edit", "account", "change password"]),
    (_answer_notifications, ["notification", "notifications", "alert", "message", "inbox"]),
]


def answer_question(message: str) -> tuple[str, list[str]]:
    """Return (reply, suggestion chips) for a farmer's question.

    Matching is deterministic: lowercase the message, count keyword hits per
    topic, and pick the best topic; ties go to the earliest topic. Unknown
    topics fall back to an honest scope-limited reply.
    """
    text = message.lower().strip()

    best: tuple | None = None
    best_score = 0
    for handler, keywords in _TOPICS:
        score = sum(1 for keyword in keywords if _matches(text, keyword))
        if score > best_score:
            best = handler
            best_score = score

    if best is None:
        return _answer_fallback()
    return best()
