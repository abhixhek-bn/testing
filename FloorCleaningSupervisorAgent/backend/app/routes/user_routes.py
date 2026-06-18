from fastapi import APIRouter, HTTPException

from app.schemas.user_schema import UserCreateRequest, UserShiftUpdateRequest
from app.services.user_service import add_user, change_user_shift, fetch_user, fetch_users, remove_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("")
def list_users_route(role: str | None = None, store_id: str | None = None):
    return fetch_users(role=role, store_id=store_id)


@router.get("/{user_id}")
def fetch_user_route(user_id: str):
    user = fetch_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    return user


@router.post("")
def create_user_route(payload: UserCreateRequest):
    return add_user(payload)


@router.put("/{user_id}/shift")
def update_shift_route(user_id: str, payload: UserShiftUpdateRequest):
    user = change_user_shift(user_id, payload.shift_start, payload.shift_end)
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    return user


@router.delete("/{user_id}")
def delete_user_route(user_id: str):
    result = remove_user(user_id)
    if not result:
        raise HTTPException(status_code=404, detail="user not found")
    return result

