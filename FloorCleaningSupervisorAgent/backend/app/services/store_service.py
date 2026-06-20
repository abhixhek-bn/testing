from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from app.core.database import (
    alerts_container,
    audit_logs_container,
    checkpoints_container,
    reports_container,
    rounds_container,
    scan_container,
    settings_container,
    stores_container,
    tags_container,
    users_container,
)
from app.services.scan_service import _ensure_daily_rounds


def _now() -> str:
    return datetime.utcnow().isoformat()


def _today_date() -> str:
    return datetime.utcnow().date().isoformat()


def _store_defaults(store: Dict[str, Any]) -> Dict[str, Any]:
    data = dict(store)
    data.setdefault("daily_rounds", 3)
    data.setdefault("checkpoint_count", 0)
    data.setdefault("round_duration_minutes", 90)
    data.setdefault("duplicate_window_minutes", 30)
    data.setdefault("gps_required", True)
    data.setdefault("fraud_detection", True)
    data.setdefault("duplicate_block", True)
    data.setdefault("push_alerts", True)
    data.setdefault("compliance", 0)
    data.setdefault("nfcCount", 0)
    data.setdefault("activeAlerts", 0)
    data.setdefault("lastSync", None)
    return data


def _related_counts(store_id: str) -> Dict[str, int]:
    tags = list(tags_container.query_items(query="SELECT * FROM c WHERE c.store_id=@store_id", parameters=[{"name": "@store_id", "value": store_id}], enable_cross_partition_query=True))
    alerts = list(alerts_container.query_items(query="SELECT * FROM c WHERE c.store_id=@store_id", parameters=[{"name": "@store_id", "value": store_id}], enable_cross_partition_query=True))
    scans = list(scan_container.query_items(query="SELECT * FROM c WHERE c.store_id=@store_id", parameters=[{"name": "@store_id", "value": store_id}], enable_cross_partition_query=True))
    rounds = list(rounds_container.query_items(query="SELECT * FROM c WHERE c.store_id=@store_id", parameters=[{"name": "@store_id", "value": store_id}], enable_cross_partition_query=True))
    return {
        "nfcCount": len(tags),
        "activeAlerts": len([alert for alert in alerts if not alert.get("reviewed")]),
        "scanCount": len(scans),
        "roundCount": len(rounds),
    }


def get_all_stores():
    stores = [_store_defaults(store) for store in stores_container.read_all_items()]
    for store in stores:
        store.update(_related_counts(store["id"]))
    return stores


def get_store(store_id: str):
    try:
        store = stores_container.read_item(item=store_id, partition_key=store_id)
    except Exception:
        return None

    store = _store_defaults(store)
    store.update(_related_counts(store_id))
    return store


def create_store(data):
    store = _store_defaults(
        {
            "id": data.id,
            "name": data.name,
            "storeNumber": data.storeNumber,
            "location": data.location,
            "manager": data.manager,
            "created_at": _now(),
        }
    )
    stores_container.create_item(store)
    return store


def update_store_config(
    store_id: str,
    daily_rounds: int,
    checkpoint_count: int,
    round_duration_minutes: Optional[int] = None,
    duplicate_window_minutes: Optional[int] = None,
):
    store = get_store(store_id)
    if not store:
        return None

    store["daily_rounds"] = daily_rounds
    store["checkpoint_count"] = checkpoint_count
    if round_duration_minutes is not None:
        store["round_duration_minutes"] = round_duration_minutes
    if duplicate_window_minutes is not None:
        store["duplicate_window_minutes"] = duplicate_window_minutes
    store["updated_at"] = _now()

    stores_container.replace_item(item=store_id, body=store)
    _ensure_daily_rounds(store_id, _today_date(), daily_rounds, checkpoint_count or 1)
    return {"message": "Store configuration updated", "store": store}


def update_round_config(store_id: str, daily_rounds: int, round_duration_minutes: int, duplicate_window_minutes: int):
    return update_store_config(
        store_id=store_id,
        daily_rounds=daily_rounds,
        checkpoint_count=get_store(store_id).get("checkpoint_count", 0) if get_store(store_id) else 0,
        round_duration_minutes=round_duration_minutes,
        duplicate_window_minutes=duplicate_window_minutes,
    )


def delete_store(store_id: str):
    store = get_store(store_id)
    if not store:
        return None

    for container in (tags_container, alerts_container, rounds_container, scan_container, settings_container, checkpoints_container, reports_container, audit_logs_container):
        items = list(container.query_items(query="SELECT * FROM c WHERE c.store_id=@store_id", parameters=[{"name": "@store_id", "value": store_id}], enable_cross_partition_query=True))
        for item in items:
            try:
                container.delete_item(item=item["id"], partition_key=store_id)
            except Exception:
                pass

    # Clean up any store scoped users.
    users = list(users_container.query_items(query="SELECT * FROM c WHERE c.store_id=@store_id", parameters=[{"name": "@store_id", "value": store_id}], enable_cross_partition_query=True))
    for user in users:
        try:
            users_container.delete_item(item=user["id"], partition_key=user["user_id"])
        except Exception:
            pass

    stores_container.delete_item(item=store_id, partition_key=store_id)
    return {"message": "Store deleted successfully"}
