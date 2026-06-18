from typing import Optional

from pydantic import BaseModel, Field

class SettingsUpdate(BaseModel):
    gps_required: bool
    fraud_detection: bool
    duplicate_block: bool
    push_alerts: bool
    gps_tolerance_meters: Optional[int] = Field(default=15, ge=1, le=500)
    duplicate_window_minutes: Optional[int] = Field(default=30, ge=1, le=240)


class SettingsResponse(BaseModel):
    id: str
    gps_required: bool
    fraud_detection: bool
    duplicate_block: bool
    push_alerts: bool
    gps_tolerance_meters: int = 15
    duplicate_window_minutes: int = 30
