from __future__ import annotations

from typing import Any, Dict

from app.core.database import settings_container


def _defaults(store_id: str) -> Dict[str, Any]:
    return {
        "id": store_id,
        "gps_required": True,
        "fraud_detection": True,
        "duplicate_block": True,
        "push_alerts": True,
        "gps_tolerance_meters": 15,
        "duplicate_window_minutes": 30,
    }


def get_settings(store_id: str):
    try:
        settings = settings_container.read_item(item=store_id, partition_key=store_id)
    except Exception:
        settings = _defaults(store_id)
        settings_container.upsert_item(settings)

    defaults = _defaults(store_id)
    defaults.update(settings)
    return defaults


def update_settings(
    store_id: str,
    gps_required: bool,
    fraud_detection: bool,
    duplicate_block: bool,
    push_alerts: bool,
    gps_tolerance_meters: int = 15,
    duplicate_window_minutes: int = 30,
):
    settings = {
        "id": store_id,
        "gps_required": gps_required,
        "fraud_detection": fraud_detection,
        "duplicate_block": duplicate_block,
        "push_alerts": push_alerts,
        "gps_tolerance_meters": gps_tolerance_meters,
        "duplicate_window_minutes": duplicate_window_minutes,
    }
    settings_container.upsert_item(settings)
    return {"message": "Settings updated", "settings": settings}

