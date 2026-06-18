from typing import Optional, Literal

from pydantic import BaseModel, Field

class RegisterRequest(BaseModel):
    user_id: str
    name: str
    email: str
    password: str
    role: Literal["admin", "cleaner"]
    store_id: Optional[str] = None

class LoginRequest(BaseModel):
    user_id: str
    password: str
    role: Literal["admin", "cleaner"]


class AuthUserResponse(BaseModel):
    user_id: str
    name: str
    role: Literal["admin", "cleaner"]
    store_id: Optional[str] = None


class AuthResponse(BaseModel):
    status: str
    message: str | None = None
    user: Optional[AuthUserResponse] = None


class UserCreateRequest(BaseModel):
    name: str = Field(min_length=2)
    username: str = Field(min_length=2)
    password: str = Field(min_length=6)
    role: Literal["admin", "cleaner"] = "cleaner"
    store_id: Optional[str] = None
    email: Optional[str] = None


class ShiftUpdateRequest(BaseModel):
    shift_start: str
    shift_end: str
