from __future__ import annotations

import math
import uuid
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

from app.core.database import (
    alerts_container,
    audit_logs_container,
    checkpoints_container,
    rounds_container,
    scan_container,
    settings_container,
    stores_container,
    tags_container,
)
def _now() -> str:
    return datetime.utcnow().isoformat()


def _query_one(container, query: str, parameters: list[dict[str, Any]]):
    items = list(
        container.query_items(
            query=query,
            parameters=parameters,
            enable_cross_partition_query=True,
        )
    )
    return items[0] if items else None


def _get_settings(store_id: str) -> Dict[str, Any]:
    try:
        settings = settings_container.read_item(item=store_id, partition_key=store_id)
    except Exception:
        settings = {
            "id": store_id,
            "gps_required": True,
            "fraud_detection": True,
            "duplicate_block": True,
            "push_alerts": True,
            "gps_tolerance_meters": 15,
            "duplicate_window_minutes": 30,
        }
        settings_container.upsert_item(settings)
    return settings


def _get_tag(uid: str):
    return _query_one(
        tags_container,
        "SELECT * FROM c WHERE c.nfc_tag_uid = @uid",
        [{"name": "@uid", "value": uid}],
    )


def _get_checkpoint(uid: str):
    return _query_one(
        checkpoints_container,
        "SELECT * FROM c WHERE c.nfc_tag_uid = @uid",
        [{"name": "@uid", "value": uid}],
    )


def _latest_scan_for_uid(uid: str):
    scans = list(
        scan_container.query_items(
            query="SELECT * FROM c WHERE c.nfc_tag_uid = @uid",
            parameters=[{"name": "@uid", "value": uid}],
            enable_cross_partition_query=True,
        )
    )
    scans.sort(key=lambda item: item.get("server_timestamp", ""))
    return scans[-1] if scans else None


def _distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    return radius * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def _create_alert(
    store_id: str,
    alert_type: str,
    category: str,
    title: str,
    description: str,
    time: str,
    *,
    location: Optional[str] = None,
    staff: Optional[str] = None,
    source_scan_id: Optional[str] = None,
    related_tag_uid: Optional[str] = None,
    related_checkpoint_id: Optional[str] = None,
):
    alert = {
        "id": str(uuid.uuid4()),
        "store_id": store_id,
        "type": alert_type,
        "category": category,
        "title": title,
        "description": description,
        "time": time,
        "location": location,
        "staff": staff,
        "source_scan_id": source_scan_id,
        "related_tag_uid": related_tag_uid,
        "related_checkpoint_id": related_checkpoint_id,
        "reviewed": False,
        "created_at": _now(),
    }
    alerts_container.create_item(alert)
    return alert


def _create_audit_log(store_id: str, action: str, entity_type: str, entity_id: str, details: Dict[str, Any], performed_by: Optional[str] = None):
    audit_log = {
        "id": str(uuid.uuid4()),
        "store_id": store_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "performed_by": performed_by,
        "details": details,
        "timestamp": _now(),
    }
    audit_logs_container.create_item(audit_log)
    return audit_log


def _ensure_round_session(store_id: str, employee_id: str, employee_name: str, shift_date: str, expected_checkpoints: int):
    round_id = f"{store_id}:{employee_id}:{shift_date}"
    try:
        session = rounds_container.read_item(item=round_id, partition_key=store_id)
    except Exception:
        session = {
            "id": round_id,
            "store_id": store_id,
            "employee_id": employee_id,
            "employee_name": employee_name,
            "name": f"Cleaning Round {shift_date}",
            "shift_date": shift_date,
            "time": _now(),
            "staff": employee_name,
            "status": "active",
            "totalScans": expected_checkpoints,
            "completedScans": 0,
            "compliance": 0,
            "scans": [],
        }
        rounds_container.create_item(session)
    return session


def _update_round_session(session: Dict[str, Any], scan_item: Dict[str, Any], expected_checkpoints: int):
    scans = list(session.get("scans", []))
    scans.append(
        {
            "id": scan_item["id"],
            "location": scan_item.get("checkpoint_name") or scan_item.get("tag_location") or scan_item["nfc_tag_uid"],
            "time": scan_item["server_timestamp"],
            "status": scan_item["scan_status"],
            "nfcUid": scan_item["nfc_tag_uid"],
            "staff": scan_item.get("employee_name"),
            "compliance": 100 if scan_item["scan_status"] == "verified" else 0,
        }
    )

    completed = len([scan for scan in scans if scan["status"] == "verified"])
    compliance = round((completed / max(expected_checkpoints, 1)) * 100)
    session["scans"] = scans
    session["completedScans"] = completed
    session["totalScans"] = expected_checkpoints
    session["compliance"] = compliance
    session["last_scan_time"] = scan_item["server_timestamp"]
    session["status"] = "completed" if completed >= expected_checkpoints else "active"
    rounds_container.upsert_item(session)
    return session


def _scan_validation_window(settings: Dict[str, Any]) -> int:
    return int(settings.get("duplicate_window_minutes", 30) or 30)


def process_scan(data):
    now_iso = _now()
    tag = _get_tag(data.nfc_tag_uid)
    checkpoint = _get_checkpoint(data.nfc_tag_uid)

    if not tag and not checkpoint:
        return {
            "status": "unregistered_tag",
            "message": "NFC tag is not registered",
            "scan_id": None,
            "alert_ids": [],
        }

    store_id = data.store_id or (tag or {}).get("store_id") or (checkpoint or {}).get("store_id")
    if not store_id:
        return {
            "status": "checkpoint_mismatch",
            "message": "Unable to resolve store for this scan",
            "scan_id": None,
            "alert_ids": [],
        }

    settings = _get_settings(store_id)
    store = None
    try:
        store = stores_container.read_item(item=store_id, partition_key=store_id)
    except Exception:
        store = None

    employee_id = data.employee_id or getattr(data, "user_id", None) or "unassigned"
    employee_name = data.employee_name or getattr(data, "user_name", None) or "Unknown"
    alert_ids: list[str] = []

    if tag and tag.get("status") == "deactivated":
        return {
            "status": "tag_inactive",
            "message": "Tag is deactivated",
            "scan_id": None,
            "store_id": store_id,
            "checkpoint_id": checkpoint["id"] if checkpoint else None,
            "alert_ids": [],
        }

    duplicate_scan = False
    duplicate_reason = None
    last_scan = _latest_scan_for_uid(data.nfc_tag_uid)
    if last_scan:
        try:
            last_scan_time = datetime.fromisoformat(last_scan["server_timestamp"])
            current_time = datetime.fromisoformat(now_iso)
            delta_minutes = (current_time - last_scan_time).total_seconds() / 60
            if delta_minutes <= _scan_validation_window(settings):
                duplicate_scan = True
                duplicate_reason = delta_minutes
        except Exception:
            duplicate_scan = False

    gps_mismatch = False
    gps_distance = None
    if settings.get("gps_required") and checkpoint and checkpoint.get("gps_lat") is not None and checkpoint.get("gps_lon") is not None:
        try:
            gps_distance = _distance_meters(float(checkpoint["gps_lat"]), float(checkpoint["gps_lon"]), float(data.gps_lat), float(data.gps_lon))
            gps_mismatch = gps_distance > float(settings.get("gps_tolerance_meters", 15))
        except Exception:
            gps_mismatch = False

    checkpoint_mismatch = checkpoint is None
    scan_status = "verified"
    compliance_status = "verified"

    if checkpoint_mismatch:
        scan_status = "pending"
        compliance_status = "checkpoint_mismatch"
        alert = _create_alert(
            store_id=store_id,
            alert_type="critical",
            category="missing-round",
            title="Unregistered Checkpoint Scan",
            description=f"NFC tag {data.nfc_tag_uid} was scanned but no checkpoint registration was found.",
            time=now_iso,
            staff=employee_name,
            related_tag_uid=data.nfc_tag_uid,
        )
        alert_ids.append(alert["id"])
    elif gps_mismatch:
        scan_status = "error"
        compliance_status = "gps_mismatch"
        alert = _create_alert(
            store_id=store_id,
            alert_type="fraud",
            category="gps-mismatch",
            title=f"GPS Mismatch Detected â€” {checkpoint.get('name')}",
            description=f"The scan location is {round(gps_distance or 0)}m away from the registered checkpoint.",
            time=now_iso,
            location=checkpoint.get("name"),
            staff=employee_name,
            related_tag_uid=data.nfc_tag_uid,
            related_checkpoint_id=checkpoint.get("id"),
        )
        alert_ids.append(alert["id"])
    elif duplicate_scan and settings.get("duplicate_block"):
        scan_status = "error"
        compliance_status = "duplicate_scan"
        alert = _create_alert(
            store_id=store_id,
            alert_type="warning",
            category="duplicate-scan",
            title=f"Duplicate Scan â€” {checkpoint.get('name') if checkpoint else data.nfc_tag_uid}",
            description=f"The same tag was scanned again within {settings.get('duplicate_window_minutes', 30)} minutes.",
            time=now_iso,
            location=checkpoint.get("name") if checkpoint else None,
            staff=employee_name,
            source_scan_id=last_scan.get("id") if last_scan else None,
            related_tag_uid=data.nfc_tag_uid,
            related_checkpoint_id=checkpoint.get("id") if checkpoint else None,
        )
        alert_ids.append(alert["id"])

    if tag:
        tag["last_scanned_at"] = now_iso
        tag["scan_count"] = int(tag.get("scan_count", 0)) + 1
        if tag.get("status") == "unassigned":
            tag["status"] = "active"
        tags_container.replace_item(item=tag["id"], body=tag)

    if checkpoint:
        checkpoint["last_scanned_at"] = now_iso
        checkpoint["scan_count"] = int(checkpoint.get("scan_count", 0)) + 1
        checkpoints_container.replace_item(item=checkpoint["id"], body=checkpoint)

    scan_item = {
        "id": str(uuid.uuid4()),
        "store_id": store_id,
        "checkpoint_id": checkpoint.get("id") if checkpoint else None,
        "checkpoint_name": checkpoint.get("name") if checkpoint else None,
        "tag_id": tag.get("id") if tag else None,
        "nfc_tag_uid": data.nfc_tag_uid,
        "server_timestamp": now_iso,
        "device_timestamp": data.device_timestamp,
        "gps_lat": data.gps_lat,
        "gps_lon": data.gps_lon,
        "gps_accuracy": data.gps_accuracy,
        "shift_date": data.shift_date,
        "employee_id": employee_id,
        "employee_name": employee_name,
        "scan_status": scan_status,
        "compliance_status": compliance_status,
        "gps_distance_m": gps_distance,
        "duplicate_scan": duplicate_scan,
        "duplicate_minutes": duplicate_reason,
        "store_name": store.get("name") if store else None,
        "tag_location": tag.get("location") if tag else None,
    }

    scan_container.create_item(scan_item)
    _create_audit_log(
        store_id=store_id,
        action="scan_created",
        entity_type="scan",
        entity_id=scan_item["id"],
        details={
            "checkpoint_id": scan_item["checkpoint_id"],
            "nfc_tag_uid": scan_item["nfc_tag_uid"],
            "scan_status": scan_status,
            "compliance_status": compliance_status,
        },
        performed_by=employee_name,
    )

    expected_checkpoints = int(store.get("checkpoint_count", 0) or 0) if store else 0
    if expected_checkpoints == 0 and checkpoint:
        expected_checkpoints = 1

    round_session = _ensure_round_session(store_id, employee_id, employee_name, data.shift_date, expected_checkpoints or 1)
    round_session = _update_round_session(round_session, scan_item, expected_checkpoints or 1)

    if settings.get("push_alerts") and round_session["compliance"] < 75 and not any(alert_id for alert_id in alert_ids if alert_id):
        existing_low = list(
            alerts_container.query_items(
                query="SELECT * FROM c WHERE c.store_id=@store_id AND c.category='low-compliance'",
                parameters=[{"name": "@store_id", "value": store_id}],
                enable_cross_partition_query=True,
            )
        )
        if not existing_low:
            alert = _create_alert(
                store_id=store_id,
                alert_type="warning",
                category="low-compliance",
                title=f"Low Compliance â€” {round_session['name']}",
                description=f"Current round compliance is {round_session['compliance']}%.",
                time=now_iso,
                staff=employee_name,
                related_tag_uid=data.nfc_tag_uid,
                related_checkpoint_id=scan_item["checkpoint_id"],
                source_scan_id=scan_item["id"],
            )
            alert_ids.append(alert["id"])

    if round_session["status"] == "completed" and round_session["compliance"] and round_session["compliance"] < 100:
        existing_too_quick = list(
            alerts_container.query_items(
                query="SELECT * FROM c WHERE c.store_id=@store_id AND c.category='too-quick'",
                parameters=[{"name": "@store_id", "value": store_id}],
                enable_cross_partition_query=True,
            )
        )
        if not existing_too_quick:
            alert = _create_alert(
                store_id=store_id,
                alert_type="warning" if round_session["compliance"] >= 75 else "critical",
                category="too-quick",
                title=f"Round Completed â€” {round_session['name']}",
                description=f"Round completed with {round_session['compliance']}% compliance.",
                time=now_iso,
                staff=employee_name,
                related_tag_uid=data.nfc_tag_uid,
                source_scan_id=scan_item["id"],
            )
            alert_ids.append(alert["id"])

    return {
        "status": "success",
        "message": "Scan processed",
        "scan_id": scan_item["id"],
        "store_id": store_id,
        "checkpoint_id": scan_item["checkpoint_id"],
        "alert_ids": alert_ids,
        "compliance_status": scan_item["compliance_status"],
        "round": {
            "id": round_session["id"],
            "name": round_session["name"],
            "compliance": round_session["compliance"],
            "completedScans": round_session["completedScans"],
            "totalScans": round_session["totalScans"],
            "status": round_session["status"],
        },
    }


def get_scan_history(store_id: str):
    scans = list(
        scan_container.query_items(
            query="SELECT * FROM c WHERE c.store_id=@store_id",
            parameters=[{"name": "@store_id", "value": store_id}],
            enable_cross_partition_query=True,
        )
    )
    scans.sort(key=lambda item: item.get("server_timestamp", ""), reverse=True)
    return scans


def get_scan_stats(store_id: str):
    scans = get_scan_history(store_id)
    total = len(scans)
    verified = len([scan for scan in scans if scan.get("scan_status") == "verified"])
    duplicate = len([scan for scan in scans if scan.get("compliance_status") == "duplicate_scan"])
    fraud = len([scan for scan in scans if scan.get("compliance_status") == "gps_mismatch"])
    pending = len([scan for scan in scans if scan.get("scan_status") == "pending"])
    return {
        "total_scans": total,
        "verified_scans": verified,
        "duplicate_scans": duplicate,
        "fraud_scans": fraud,
        "pending_scans": pending,
    }
