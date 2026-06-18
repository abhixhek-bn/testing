from typing import Optional, Literal

from pydantic import BaseModel, Field

class CheckpointCreate(BaseModel):
    id: str = Field(min_length=2)
    store_id: str
    name: str = Field(min_length=2)
    nfc_tag_uid: str
    gps_lat: float
    gps_lon: float
    registered_by: str
    area: Optional[str] = None
    zone: Optional[str] = None
    floor: Optional[str] = None
    priority: Optional[Literal["high", "medium", "low"]] = None


class CheckpointResponse(BaseModel):
    id: str
    store_id: str
    name: str
    nfc_tag_uid: str
    gps_lat: float
    gps_lon: float
    registered_at: Optional[str] = None
    registered_by: Optional[str] = None
    deployment_status: Optional[str] = None
    is_active: Optional[bool] = None
    area: Optional[str] = None
    zone: Optional[str] = None
    floor: Optional[str] = None
    priority: Optional[str] = None
