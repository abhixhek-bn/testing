from __future__ import annotations

from app.services.auth_service import create_user, delete_user, get_user, list_users, update_user_shift


def fetch_users(role=None, store_id=None):
    return list_users(role=role, store_id=store_id)


def add_user(data):
    return create_user(data)


def change_user_shift(user_id: str, shift_start: str, shift_end: str):
    return update_user_shift(user_id, shift_start, shift_end)


def remove_user(user_id: str):
    return delete_user(user_id)


def fetch_user(user_id: str):
    return get_user(user_id)
