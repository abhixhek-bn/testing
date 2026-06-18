from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.core.database import checkpoints_container


def _now() -> str:
    return datetime.utcnow().isoformat()


def _serialize(checkpoint):
    if not checkpoint:
        return None
    return {
        "id": checkpoint.get("id"),
        "store_id": checkpoint.get("store_id"),
        "name": checkpoint.get("name"),
        "nfc_tag_uid": checkpoint.get("nfc_tag_uid"),
        "gps_lat": checkpoint.get("gps_lat"),
        "gps_lon": checkpoint.get("gps_lon"),
        "registered_at": checkpoint.get("registered_at"),
        "registered_by": checkpoint.get("registered_by"),
        "deployment_status": checkpoint.get("deployment_status", "draft"),
        "is_active": checkpoint.get("is_active", False),
        "area": checkpoint.get("area"),
        "zone": checkpoint.get("zone"),
        "floor": checkpoint.get("floor"),
        "priority": checkpoint.get("priority"),
    }


def create_checkpoint(data):
    item = {
        "id": data.id,
        "store_id": data.store_id,
        "name": data.name,
        "nfc_tag_uid": data.nfc_tag_uid,
        "gps_lat": data.gps_lat,
        "gps_lon": data.gps_lon,
        "registered_at": _now(),
        "registered_by": data.registered_by,
        "deployment_status": "draft",
        "is_active": False,
        "area": getattr(data, "area", None),
        "zone": getattr(data, "zone", None),
        "floor": getattr(data, "floor", None),
        "priority": getattr(data, "priority", None),
    }

    checkpoints_container.create_item(item)
    return {"message": "Checkpoint registered successfully", "checkpoint": _serialize(item)}


def get_checkpoint(checkpoint_id: str, store_id: Optional[str] = None):
    try:
        if store_id:
            checkpoint = checkpoints_container.read_item(item=checkpoint_id, partition_key=store_id)
        else:
            query = "SELECT * FROM c WHERE c.id = @checkpoint_id"
            items = list(
                checkpoints_container.query_items(
                    query=query,
                    parameters=[{"name": "@checkpoint_id", "value": checkpoint_id}],
                    enable_cross_partition_query=True,
                )
            )
            checkpoint = items[0] if items else None
    except Exception:
        checkpoint = None
    return _serialize(checkpoint)


def list_checkpoints(store_id: Optional[str] = None):
    if store_id:
        query = "SELECT * FROM c WHERE c.store_id=@store_id"
        items = list(
            checkpoints_container.query_items(
                query=query,
                parameters=[{"name": "@store_id", "value": store_id}],
                enable_cross_partition_query=True,
            )
        )
    else:
        items = list(checkpoints_container.read_all_items())
    return [_serialize(item) for item in items]


def deploy_checkpoint(checkpoint_id: str):
    checkpoint = get_checkpoint(checkpoint_id)
    if not checkpoint:
        return None

    checkpoint["deployment_status"] = "deployed"
    checkpoint["is_active"] = True
    checkpoints_container.replace_item(item=checkpoint["id"], body=checkpoint)
    return checkpoint


def cancel_checkpoint(checkpoint_id: str):
    checkpoint = get_checkpoint(checkpoint_id)
    if not checkpoint:
        return None

    checkpoint["deployment_status"] = "cancelled"
    checkpoint["is_active"] = False
    checkpoints_container.replace_item(item=checkpoint["id"], body=checkpoint)
    return checkpoint

