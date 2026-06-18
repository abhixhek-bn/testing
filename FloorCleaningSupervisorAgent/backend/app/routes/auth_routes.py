from fastapi import APIRouter

from app.schemas.auth_schema import RegisterRequest, LoginRequest
from app.services.auth_service import register_user, login_user

router = APIRouter()

@router.post("/register")
def register_user_route(data:RegisterRequest):
    return register_user(data)


@router.post("/login")
def login_user_route(data: LoginRequest):
    return login_user(data)