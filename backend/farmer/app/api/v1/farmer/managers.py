# ApnaDairy — v2 manager-linking HTTP routers.
# MANAGER side (this module): the area manager reviews pending registration
# requests for their OWN center — list, accept, decline, end. Every action is
# scoped by the current_manager dependency -> (profile, area_manager row);
# a request from another center is invisible (404).
# FARMER side lives in app.api.v1.farmer.linking and is included below, so
# the `router` that app.main already mounts serves the full v2 linking flow
# with no main.py change. Do NOT also mount linking.router separately
# (duplicate routes).
# Thin layer: auth dependency -> service call -> validated response.

from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.farmer.linking import router as farmer_linking_router
from app.core.deps import current_manager
from app.schemas.farmer.linking import (
    DeclineRequestIn,
    LinkActionOut,
    PendingRequestOut,
)
from app.services.farmer import manager_service
from app.services.farmer.manager_service import (
    RequestNotFoundError,
    RequestStateError,
)

manager_router = APIRouter(prefix="/api/v1/manager", tags=["manager-linking"])

# Aggregator mounted by app.main (kept name `router` for compatibility).
router = APIRouter()
router.include_router(farmer_linking_router)
router.include_router(manager_router)


def _my_center_id(ctx: tuple) -> str:
    """Extract the caller's area_managers.id from the current_manager tuple.

    current_manager returns (profile, area_manager row) and raises 403
    itself when the caller is not an area manager.
    """
    _profile, area_manager = ctx
    if not area_manager or not area_manager.get("id"):
        raise HTTPException(
            status_code=403, detail="Area manager profile not found."
        )
    return area_manager["id"]


@manager_router.get("/requests", response_model=list[PendingRequestOut])
def read_pending_requests(
    ctx: tuple = Depends(current_manager),
) -> list[PendingRequestOut]:
    """List pending registration requests for the manager's own center."""
    return manager_service.list_pending_requests(_my_center_id(ctx))


@manager_router.post("/requests/{request_id}/accept", response_model=LinkActionOut)
def accept_request(
    request_id: str, ctx: tuple = Depends(current_manager)
) -> LinkActionOut:
    """Accept a pending request: farmer linked exclusively to my center."""
    try:
        return manager_service.accept_request(_my_center_id(ctx), request_id)
    except RequestNotFoundError:
        raise HTTPException(status_code=404, detail="Request not found.")
    except RequestStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@manager_router.post("/requests/{request_id}/decline", response_model=LinkActionOut)
def decline_request(
    request_id: str,
    data: DeclineRequestIn,
    ctx: tuple = Depends(current_manager),
) -> LinkActionOut:
    """Decline a pending request with an optional reason."""
    try:
        return manager_service.decline_request(
            _my_center_id(ctx), request_id, data.reason
        )
    except RequestNotFoundError:
        raise HTTPException(status_code=404, detail="Request not found.")
    except RequestStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@manager_router.post("/requests/{request_id}/end", response_model=LinkActionOut)
def end_linkage(
    request_id: str, ctx: tuple = Depends(current_manager)
) -> LinkActionOut:
    """End an accepted linkage; the farmer's center link is cleared."""
    try:
        return manager_service.end_linkage(_my_center_id(ctx), request_id)
    except RequestNotFoundError:
        raise HTTPException(status_code=404, detail="Request not found.")
    except RequestStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
