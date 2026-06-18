from typing import Optional

from pydantic import BaseModel, Field

class StoreConfigUpdate(BaseModel):
    daily_rounds: int = Field(ge=1, le=99)
    checkpoint_count: int = Field(ge=1, le=999)
    round_duration_minutes: Optional[int] = Field(default=None, ge=10, le=360)
    duplicate_window_minutes: Optional[int] = Field(default=None, ge=1, le=240)

class StoreResponse(BaseModel):
    id: str
    name: str
    storeNumber: Optional[str] = None
    location: str
    manager: Optional[str] = None
    daily_rounds: Optional[int] = None
    checkpoint_count: Optional[int] = None
    round_duration_minutes: Optional[int] = None
    duplicate_window_minutes: Optional[int] = None


class StoreCreateRequest(BaseModel):
    id: str
    name: str
    storeNumber: str
    location: str
    manager: Optional[str] = None


class RoundConfigUpdate(BaseModel):
    daily_rounds: int = Field(ge=1, le=99)
    round_duration_minutes: int = Field(ge=10, le=360)
    duplicate_window_minutes: int = Field(ge=1, le=240)


class StoreDeleteResponse(BaseModel):
    message: str
