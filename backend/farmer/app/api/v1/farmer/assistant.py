# ApnaDairy — Farmer assistant HTTP router.
# Thin layer: auth dependency -> service call -> validated response.
# The service is pure and deterministic, so no DB access happens here.

from fastapi import APIRouter, Depends

from app.core.deps import current_farmer
from app.schemas.farmer.assistant import AssistantMessageIn, AssistantReplyOut
from app.services.farmer.assistant_service import answer_question

router = APIRouter(prefix="/api/v1/farmer", tags=["farmer-assistant"])


@router.post("/assistant", response_model=AssistantReplyOut)
def ask_assistant(
    payload: AssistantMessageIn, ctx: tuple = Depends(current_farmer)
) -> AssistantReplyOut:
    """Answer a farmer's question with the built-in help assistant."""
    message = payload.message.strip()
    if not message:
        # pydantic min_length=1 passes for whitespace-only input; an
        # assistant has nothing to answer here.
        return AssistantReplyOut(
            reply=(
                "I can only answer questions about using the ApnaDairy farmer "
                "app. Please type a question."
            ),
            suggestions=[
                "How do I register with an area manager?",
                "How do I sell my milk?",
                "How is the price calculated?",
            ],
        )
    reply, suggestions = answer_question(message)
    return AssistantReplyOut(reply=reply, suggestions=suggestions)
