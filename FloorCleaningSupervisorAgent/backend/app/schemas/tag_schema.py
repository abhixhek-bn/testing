from typing import Literal, Optional

from pydantic import BaseModel, Field

class RegisterTagRequest(BaseModel):
    store_id: str
    nfc_tag_uid: str = Field(min_length=3)

class AssignTagRequest(BaseModel):
    store_id: str
    location: str = Field(min_length=2)
    area: Optional[str] = None
    floor: Optional[str] = None
    zone: Optional[str] = None
    priority: Optional[Literal["high", "medium", "low"]] = None
    notes: Optional[str] = None

class TagResponse(BaseModel):
    id: str
    store_id: str
    nfc_tag_uid: str
    location: str
    status: str
    area: Optional[str] = None
    floor: Optional[str] = None
    zone: Optional[str] = None
    priority: Optional[str] = None
    last_scanned_at: Optional[str] = None
    registered_at: Optional[str] = None


class TagStatusUpdateRequest(BaseModel):
    status: Literal["active", "warning", "error", "deactivated", "unassigned"]


class TagStatsResponse(BaseModel):
    registered: int
    unregistered: int
    errors: int
    deactivated: int = 0


class ResetTagsResponse(BaseModel):
    message: str

