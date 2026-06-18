from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from app.core.database import alerts_container


def _now() -> str:
    return datetime.utcnow().isoformat()


def _serialize(alert: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": alert.get("id"),
        "store_id": alert.get("store_id"),
        "type": alert.get("type"),
        "category": alert.get("category"),
        "title": alert.get("title"),
        "description": alert.get("description"),
        "time": alert.get("time"),
        "location": alert.get("location"),
        "staff": alert.get("staff"),
        "reviewed": alert.get("reviewed", False),
        "reviewed_by": alert.get("reviewed_by"),
        "reviewed_at": alert.get("reviewed_at"),
        "source_scan_id": alert.get("source_scan_id"),
        "related_tag_uid": alert.get("related_tag_uid"),
        "related_checkpoint_id": alert.get("related_checkpoint_id"),
        "created_at": alert.get("created_at"),
    }


def create_alert(
    store_id: str,
    type: str,
    category: str,
    title: str,
    description: str,
    time: str,
    location: Optional[str] = None,
    staff: Optional[str] = None,
    source_scan_id: Optional[str] = None,
    related_tag_uid: Optional[str] = None,
    related_checkpoint_id: Optional[str] = None,
):
    alert = {
        "id": str(uuid.uuid4()),
        "store_id": store_id,
        "type": type,
        "category": category,
        "title": title,
        "description": description,
        "time": time,
        "location": location,
        "staff": staff,
        "reviewed": False,
        "created_at": _now(),
        "source_scan_id": source_scan_id,
        "related_tag_uid": related_tag_uid,
        "related_checkpoint_id": related_checkpoint_id,
    }
    alerts_container.create_item(alert)
    return _serialize(alert)


def get_alert(alert_id: str, store_id: Optional[str] = None):
    try:
        if store_id:
            alert = alerts_container.read_item(item=alert_id, partition_key=store_id)
        else:
            items = list(
                alerts_container.query_items(
                    query="SELECT * FROM c WHERE c.id=@alert_id",
                    parameters=[{"name": "@alert_id", "value": alert_id}],
                    enable_cross_partition_query=True,
                )
            )
            alert = items[0] if items else None
    except Exception:
        alert = None
    return _serialize(alert) if alert else None


def list_alerts(store_id: Optional[str] = None, reviewed: Optional[bool] = None):
    if store_id:
        items = list(
            alerts_container.query_items(
                query="SELECT * FROM c WHERE c.store_id=@store_id",
                parameters=[{"name": "@store_id", "value": store_id}],
                enable_cross_partition_query=True,
            )
        )
    else:
        items = list(alerts_container.read_all_items())

    if reviewed is not None:
        items = [item for item in items if bool(item.get("reviewed", False)) == reviewed]

    items.sort(key=lambda item: item.get("created_at") or item.get("time") or "", reverse=True)
    return [_serialize(item) for item in items]


def review_alert(alert_id: str, reviewed_by: Optional[str] = None, store_id: Optional[str] = None):
    alert = get_alert(alert_id, store_id)
    if not alert:
        return None

    alert["reviewed"] = True
    alert["reviewed_by"] = reviewed_by
    alert["reviewed_at"] = _now()
    alerts_container.replace_item(item=alert["id"], body=alert)
    return alert


def mark_all_reviewed(store_id: str, reviewed_by: Optional[str] = None):
    alerts = list_alerts(store_id=store_id, reviewed=False)
    for alert in alerts:
        review_alert(alert["id"], reviewed_by=reviewed_by, store_id=store_id)
    return {"message": "All alerts marked as reviewed", "count": len(alerts)}


def get_alert_summary(store_id: Optional[str] = None):
    alerts = list_alerts(store_id=store_id)
    critical = len([a for a in alerts if a["type"] == "critical"])
    warning = len([a for a in alerts if a["type"] == "warning"])
    fraud = len([a for a in alerts if a["type"] == "fraud"])
    reviewed = len([a for a in alerts if a["reviewed"]])
    unread = len(alerts) - reviewed
    return {
        "critical": critical,
        "warning": warning,
        "fraud": fraud,
        "reviewed": reviewed,
        "unread": unread,
    }

