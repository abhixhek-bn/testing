from fastapi import APIRouter

from app.schemas.settings_schema import SettingsUpdate

from app.services.settings_service import(
    get_settings,
    update_settings
)

router=APIRouter(
    prefix="/settings",
    tags=["Settings"]
)

@router.get("/{store_id}")
def fetch_settings(
    store_id:str 
):
    return get_settings(store_id)

@router.put("/{store_id}")
def save_settings(
    store_id:str,
    payload:SettingsUpdate
):
    return update_settings(
        store_id,
        payload.gps_required,
        payload.fraud_detection,
        payload.duplicate_block,
        payload.push_alerts
        ,
        payload.gps_tolerance_meters or 15,
        payload.duplicate_window_minutes or 30,
    )
