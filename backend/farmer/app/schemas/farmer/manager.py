# ApnaDairy — Manager response schema (Pydantic v2).

from pydantic import BaseModel, ConfigDict


class ManagerOut(BaseModel):
    """One area manager assigned to the farmer (Managers tab)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    shop_name: str
    phone: str
    distance_km: float
