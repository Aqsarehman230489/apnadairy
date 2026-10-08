# ApnaDairy — Assistant chatbot request/response schemas (Pydantic v2).
# The assistant is a deterministic FAQ guide ("ApnaDairy Assistant"), not a
# generative model; these schemas carry its input and reply.

from pydantic import BaseModel, Field


class AssistantMessageIn(BaseModel):
    """A single question typed by the farmer in the assistant chat."""

    message: str = Field(min_length=1, max_length=500)


class AssistantReplyOut(BaseModel):
    """The assistant's answer plus 2-4 suggested follow-up questions."""

    reply: str
    suggestions: list[str] = Field(max_length=4)
