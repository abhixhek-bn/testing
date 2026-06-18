from typing import Optional, Literal

from pydantic import BaseModel, Field


class AlertCreateRequest(BaseModel):
    store_id: str
    type: Literal["critical", "warning", "fraud"]
    category: str
    title: str = Field(min_length=3)
    description: str = Field(min_length=3)
    time: str
    location: Optional[str] = None
    staff: Optional[str] = None
    source_scan_id: Optional[str] = None
    related_tag_uid: Optional[str] = None
    related_checkpoint_id: Optional[str] = None


class AlertReviewRequest(BaseModel):
    reviewed_by: Optional[str] = None


class AlertResponse(BaseModel):
    id: str
    store_id: str
    type: str
    category: str
    title: str
    description: str
    time: str
    location: Optional[str] = None
    staff: Optional[str] = None
    reviewed: bool = False
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None


class AlertSummaryResponse(BaseModel):
    critical: int
    warning: int
    fraud: int
    reviewed: int
    unread: int

