from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from app.core.database import tags_container


def _now() -> str:
    return datetime.utcnow().isoformat()


def _normalize_tag(tag: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": tag.get("id"),
        "store_id": tag.get("store_id"),
        "nfc_tag_uid": tag.get("nfc_tag_uid"),
        "location": tag.get("location", ""),
        "area": tag.get("area"),
        "floor": tag.get("floor"),
        "zone": tag.get("zone"),
        "priority": tag.get("priority"),
        "status": tag.get("status", "unassigned"),
        "last_scanned_at": tag.get("last_scanned_at"),
        "registered_at": tag.get("registered_at"),
        "notes": tag.get("notes"),
        "scan_count": tag.get("scan_count", 0),
    }


def _query_by_tag_id(tag_id: str, store_id: Optional[str] = None):
    if store_id:
        try:
            return tags_container.read_item(item=tag_id, partition_key=store_id)
        except Exception:
            return None

    query = "SELECT * FROM c WHERE c.id = @tag_id"
    items = list(
        tags_container.query_items(
            query=query,
            parameters=[{"name": "@tag_id", "value": tag_id}],
            enable_cross_partition_query=True,
        )
    )
    return items[0] if items else None


def _query_by_uid(uid: str):
    query = "SELECT * FROM c WHERE c.nfc_tag_uid = @uid"
    items = list(
        tags_container.query_items(
            query=query,
            parameters=[{"name": "@uid", "value": uid}],
            enable_cross_partition_query=True,
        )
    )
    return items[0] if items else None


def register_tag(store_id: str, nfc_tag_uid: str):
    existing = _query_by_uid(nfc_tag_uid)
    if existing:
        return _normalize_tag(existing)

    tag = {
        "id": str(uuid.uuid4()),
        "store_id": store_id,
        "nfc_tag_uid": nfc_tag_uid,
        "location": "",
        "area": None,
        "floor": None,
        "zone": None,
        "priority": None,
        "status": "unassigned",
        "registered_at": _now(),
        "scan_count": 0,
    }
    tags_container.create_item(tag)
    return _normalize_tag(tag)


def get_tags(store_id: str):
    query = "SELECT * FROM c WHERE c.store_id=@store_id"
    parameters = [{"name": "@store_id", "value": store_id}]
    return [_normalize_tag(item) for item in tags_container.query_items(query=query, parameters=parameters, enable_cross_partition_query=True)]


def get_tag(tag_id: str, store_id: Optional[str] = None):
    tag = _query_by_tag_id(tag_id, store_id)
    return _normalize_tag(tag) if tag else None


def assign_tag_location(tag_id: str, store_id: str, location: str, area: Optional[str] = None, floor: Optional[str] = None, zone: Optional[str] = None, priority: Optional[str] = None, notes: Optional[str] = None):
    tag = _query_by_tag_id(tag_id, store_id)
    if not tag:
        return None

    tag["store_id"] = store_id
    tag["location"] = location
    tag["area"] = area
    tag["floor"] = floor
    tag["zone"] = zone
    tag["priority"] = priority
    tag["notes"] = notes
    tag["status"] = "active"
    tag.setdefault("registered_at", _now())
    tags_container.replace_item(item=tag["id"], body=tag)
    return _normalize_tag(tag)


def update_tag_status(tag_id: str, store_id: str, status: str):
    tag = _query_by_tag_id(tag_id, store_id)
    if not tag:
        return None

    tag["status"] = status
    tag["updated_at"] = _now()
    tags_container.replace_item(item=tag["id"], body=tag)
    return _normalize_tag(tag)


def delete_tag(tag_id: str, store_id: str):
    tag = _query_by_tag_id(tag_id, store_id)
    if not tag:
        return None

    tags_container.delete_item(item=tag["id"], partition_key=store_id)
    return {"message": "Tag deleted successfully"}


def reset_tags(store_id: str):
    tags = get_tags(store_id)
    for tag in tags:
        tags_container.delete_item(item=tag["id"], partition_key=store_id)
    return {"message": "All tags removed"}


def get_tag_stats(store_id: str):
    tags = get_tags(store_id)
    registered = len([t for t in tags if t["status"] == "active"])
    unregistered = len([t for t in tags if t["status"] in {"unassigned", "pending"}])
    errors = len([t for t in tags if t["status"] == "error"])
    deactivated = len([t for t in tags if t["status"] == "deactivated"])
    return {
        "registered": registered,
        "unregistered": unregistered,
        "errors": errors,
        "deactivated": deactivated,
    }


def record_tag_scan(tag_id: str, store_id: str, scanned_at: str):
    tag = _query_by_tag_id(tag_id, store_id)
    if not tag:
        return None

    tag["last_scanned_at"] = scanned_at
    tag["scan_count"] = int(tag.get("scan_count", 0)) + 1
    tags_container.replace_item(item=tag["id"], body=tag)
    return _normalize_tag(tag)
