from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from passlib.context import CryptContext

from app.core.database import users_container

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _now() -> str:
    return datetime.utcnow().isoformat()


def _query_user_by_user_id(user_id: str):
    query = "SELECT * FROM c WHERE c.user_id = @user_id"
    items = list(
        users_container.query_items(
            query=query,
            parameters=[{"name": "@user_id", "value": user_id}],
            enable_cross_partition_query=True,
        )
    )
    return items[0] if items else None


def _query_user_by_username(username: str):
    query = "SELECT * FROM c WHERE c.username = @username"
    items = list(
        users_container.query_items(
            query=query,
            parameters=[{"name": "@username", "value": username}],
            enable_cross_partition_query=True,
        )
    )
    return items[0] if items else None


def _serialize_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "user_id": user.get("user_id") or user.get("id"),
        "name": user.get("name"),
        "username": user.get("username"),
        "role": user.get("role"),
        "store_id": user.get("store_id"),
        "email": user.get("email"),
        "shift_start": user.get("shift_start"),
        "shift_end": user.get("shift_end"),
        "joined_at": user.get("joined_at"),
    }


def register_user(data):
    if _query_user_by_user_id(data.user_id) or _query_user_by_username(getattr(data, "username", data.user_id)):
        return {
            "status": "error",
            "message": "User already exists",
        }

    user_document = {
        "id": data.user_id,
        "user_id": data.user_id,
        "name": data.name,
        "username": getattr(data, "username", data.user_id),
        "email": data.email,
        "password_hash": pwd_context.hash(data.password),
        "role": data.role,
        "store_id": data.store_id,
        "shift_start": getattr(data, "shift_start", None),
        "shift_end": getattr(data, "shift_end", None),
        "joined_at": _now(),
    }

    users_container.create_item(body=user_document)

    return {
        "status": "success",
        "message": "User registered successfully",
        "user": _serialize_user(user_document),
    }


def login_user(data):
    user = _query_user_by_user_id(data.user_id)

    if not user:
        return {
            "status": "error",
            "message": "User not found",
        }

    if not pwd_context.verify(data.password, user["password_hash"]):
        return {
            "status": "error",
            "message": "Invalid password",
        }

    if user["role"] != data.role:
        return {
            "status": "error",
            "message": "Invalid role selected",
        }

    return {
        "status": "success",
        "message": "Login successful",
        "user": _serialize_user(user),
    }


def list_users(role: Optional[str] = None, store_id: Optional[str] = None):
    items = list(users_container.read_all_items())
    if role:
        items = [item for item in items if item.get("role") == role]
    if store_id:
        items = [item for item in items if item.get("store_id") == store_id]
    return [_serialize_user(item) for item in items]


def create_user(data):
    return register_user(data)


def update_user_shift(user_id: str, shift_start: str, shift_end: str):
    user = _query_user_by_user_id(user_id)
    if not user:
        return None

    user["shift_start"] = shift_start
    user["shift_end"] = shift_end
    user["updated_at"] = _now()
    users_container.replace_item(item=user["id"], body=user)
    return _serialize_user(user)


def delete_user(user_id: str):
    user = _query_user_by_user_id(user_id)
    if not user:
        return None

    users_container.delete_item(item=user["id"], partition_key=user["user_id"])
    return {"message": "User deleted successfully"}


def get_user(user_id: str):
    user = _query_user_by_user_id(user_id)
    return _serialize_user(user) if user else None
