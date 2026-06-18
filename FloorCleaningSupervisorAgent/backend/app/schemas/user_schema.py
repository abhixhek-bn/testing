from typing import Optional, Literal

from pydantic import BaseModel, Field


class UserCreateRequest(BaseModel):
    name: str = Field(min_length=2)
    username: str = Field(min_length=2)
    password: str = Field(min_length=6)
    role: Literal["admin", "cleaner"] = "cleaner"
    store_id: Optional[str] = None
    email: Optional[str] = None
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None


class UserShiftUpdateRequest(BaseModel):
    shift_start: str
    shift_end: str


class UserResponse(BaseModel):
    user_id: str
    name: str
    username: Optional[str] = None
    role: str
    store_id: Optional[str] = None
    email: Optional[str] = None
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None
    joined_at: Optional[str] = None

