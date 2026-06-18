from fastapi import APIRouter

from app.schemas.store_schema import StoreConfigUpdate, StoreCreateRequest, RoundConfigUpdate

from app.services.store_service import (
    get_all_stores,
    get_store,
    create_store,
    delete_store,
    update_store_config
)

router=APIRouter(
    prefix="/stores",
    tags=["Stores"]
)

@router.get("")
def fetch_stores():
    return get_all_stores()

@router.get("/{store_id}")
def fetch_store(store_id:str):
    return get_store(store_id)

@router.post("")
def create_store_route(payload: StoreCreateRequest):
    return create_store(payload)

@router.put("/{store_id}/config")
def update_config(
    store_id:str,
    payload:StoreConfigUpdate
):
    return update_store_config(
        store_id,
        payload.daily_rounds,
        payload.checkpoint_count,
        payload.round_duration_minutes,
        payload.duplicate_window_minutes,
    )


@router.put("/{store_id}/round-config")
def update_round_config_route(
    store_id: str,
    payload: RoundConfigUpdate,
):
    store = get_store(store_id)
    return update_store_config(
        store_id,
        payload.daily_rounds,
        store.get("checkpoint_count", 0) if store else 0,
        payload.round_duration_minutes,
        payload.duplicate_window_minutes,
    )


@router.delete("/{store_id}")
def remove_store(store_id: str):
    return delete_store(store_id)
