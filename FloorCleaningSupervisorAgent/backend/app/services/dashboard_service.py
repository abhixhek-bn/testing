from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.database import alerts_container, rounds_container, scan_container, stores_container, tags_container, users_container
from app.services.alert_service import get_alert_summary, list_alerts
from app.services.scan_service import get_scan_history, get_scan_stats
from app.services.tag_service import get_tag_stats


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", ""))
    except Exception:
        return None


def _safe_store(store: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": store.get("id"),
        "name": store.get("name"),
        "storeNumber": store.get("storeNumber"),
        "location": store.get("location"),
        "manager": store.get("manager"),
        "compliance": store.get("compliance", 0),
        "nfcCount": store.get("nfcCount", 0),
        "activeAlerts": store.get("activeAlerts", 0),
        "lastSync": store.get("lastSync"),
        "daily_rounds": store.get("daily_rounds", 3),
        "checkpoint_count": store.get("checkpoint_count", 0),
        "round_duration_minutes": store.get("round_duration_minutes", 90),
        "duplicate_window_minutes": store.get("duplicate_window_minutes", 30),
        "complianceHistory": store.get("complianceHistory"),
    }


def _hour_bucket(dt: datetime) -> str:
    if not hasattr(dt, "strftime"):
        return ""
    bucket = dt.strftime("%I%p")
    return bucket.lstrip("0")


def _hour_sort_key(hour_label: str) -> int:
    label = hour_label.strip().upper()
    if not label:
        return 0
    suffix = 12 if label.endswith("PM") else 0
    hour_text = label[:-2]
    try:
        hour = int(hour_text)
    except ValueError:
        return 0
    if hour == 12:
        hour = 0
    return hour + suffix


def _bucket_scans(scans: List[Dict[str, Any]]):
    grouped: Dict[str, Dict[str, int]] = defaultdict(lambda: {"done": 0, "missed": 0})
    for scan in scans:
        dt = _parse_dt(scan.get("server_timestamp")) or _parse_dt(scan.get("device_timestamp"))
        if not dt:
            continue
        bucket = _hour_bucket(dt)
        if scan.get("scan_status") == "verified":
            grouped[bucket]["done"] += 1
        else:
            grouped[bucket]["missed"] += 1
    return [{"hour": hour, **values} for hour, values in sorted(grouped.items(), key=lambda item: _hour_sort_key(item[0]))]


def _store_rounds(store_id: str):
    rounds = list(
        rounds_container.query_items(
            query="SELECT * FROM c WHERE c.store_id=@store_id",
            parameters=[{"name": "@store_id", "value": store_id}],
            enable_cross_partition_query=True,
        )
    )
    rounds.sort(key=lambda item: item.get("time") or item.get("startTime") or "", reverse=True)
    return rounds


def _round_to_view(round_item: Dict[str, Any], active: bool = False):
    scans = round_item.get("scans", []) or []
    checkpoint_items = [
        {
            "id": scan.get("id"),
            "location": scan.get("location"),
            "zone": scan.get("zone"),
            "uid": scan.get("nfcUid") or scan.get("nfc_tag_uid"),
            "status": scan.get("status") or scan.get("scan_status"),
            "scannedAt": scan.get("scannedAt") or scan.get("time"),
        }
        for scan in scans
    ]
    return {
        "id": round_item.get("id"),
        "name": round_item.get("name"),
        "time": round_item.get("time"),
        "staff": round_item.get("staff") or round_item.get("employee_name"),
        "compliance": round_item.get("compliance", 0),
        "totalScans": round_item.get("totalScans", len(checkpoint_items)),
        "completedScans": round_item.get("completedScans", len([scan for scan in scans if (scan.get("status") or scan.get("scan_status")) == "verified"])),
        "isActive": active or round_item.get("status") == "active",
        "checkpointItems": checkpoint_items,
        "status": round_item.get("status", "completed"),
        "round_number": round_item.get("round_number"),
        "completed_by": round_item.get("completed_by") or round_item.get("staff") or round_item.get("employee_name"),
        "completion_time": round_item.get("completion_time") or round_item.get("completed_at") or round_item.get("last_scan_time") or round_item.get("time"),
    }


def _round_completion_time(round_item: Dict[str, Any]) -> Optional[str]:
    scans = round_item.get("scans", []) or []
    timestamps = []
    for scan in scans:
        dt = _parse_dt(scan.get("scannedAt") or scan.get("time") or scan.get("server_timestamp"))
        if dt:
            timestamps.append(dt)
    if timestamps:
        return max(timestamps).isoformat()
    return round_item.get("completion_time") or round_item.get("completed_at") or round_item.get("last_scan_time") or round_item.get("time")


def _round_number_from_item(round_item: Dict[str, Any], index: int) -> int:
    if round_item.get("round_number") is not None:
        try:
            return int(round_item.get("round_number"))
        except Exception:
            pass
    name = str(round_item.get("name") or "")
    digits = "".join(ch for ch in name if ch.isdigit())
    if digits:
        try:
            return int(digits)
        except Exception:
            pass
    return index + 1


def _nfc_details(store: Dict[str, Any], rounds: List[Dict[str, Any]]):
    tags = list(
        tags_container.query_items(
            query="SELECT * FROM c WHERE c.store_id=@store_id",
            parameters=[{"name": "@store_id", "value": store["id"]}],
            enable_cross_partition_query=True,
        )
    )
    required_scans = int(store.get("daily_rounds", 0) or store.get("checkpoint_count", 0) or len(rounds) or 1)
    details_by_uid: Dict[str, Dict[str, Any]] = {}

    for round_item in rounds:
        round_id = round_item.get("id")
        for scan in round_item.get("scans", []) or []:
            uid = scan.get("nfcUid") or scan.get("uid") or scan.get("nfc_tag_uid")
            if not uid:
                continue
            entry = details_by_uid.setdefault(uid, {
                "id": scan.get("tag_id") or uid,
                "name": scan.get("location") or scan.get("checkpoint_name") or scan.get("tag_location") or uid,
                "required_scan_count": required_scans,
                "completed_scan_count": 0,
                "checkpoint_names": [],
                "last_scan_time": None,
                "_completed_rounds": set(),
            })
            checkpoint_name = scan.get("location") or scan.get("checkpoint_name") or scan.get("tag_location")
            if checkpoint_name and checkpoint_name not in entry["checkpoint_names"]:
                entry["checkpoint_names"].append(checkpoint_name)
            scanned_at = scan.get("scannedAt") or scan.get("time")
            if scanned_at:
                current_last = _parse_dt(entry["last_scan_time"]) if entry["last_scan_time"] else None
                new_last = _parse_dt(scanned_at)
                if new_last and (not current_last or new_last > current_last):
                    entry["last_scan_time"] = scanned_at
            if (scan.get("status") or scan.get("scan_status")) == "verified" and round_id is not None:
                entry["_completed_rounds"].add(round_id)

    for tag in tags:
        uid = tag.get("nfc_tag_uid")
        if not uid:
            continue
        entry = details_by_uid.setdefault(uid, {
            "id": tag.get("id") or uid,
            "name": tag.get("location") or uid,
            "required_scan_count": required_scans,
            "completed_scan_count": 0,
            "checkpoint_names": [],
            "last_scan_time": None,
            "_completed_rounds": set(),
        })
        entry["name"] = tag.get("location") or entry["name"] or uid
        if tag.get("last_scanned_at"):
            candidate_last = _parse_dt(tag.get("last_scanned_at"))
            current_last = _parse_dt(entry["last_scan_time"]) if entry["last_scan_time"] else None
            if candidate_last and (not current_last or candidate_last > current_last):
                entry["last_scan_time"] = tag.get("last_scanned_at")
        if tag.get("location") and tag.get("location") not in entry["checkpoint_names"]:
            entry["checkpoint_names"].append(tag.get("location"))

    result = []
    for entry in details_by_uid.values():
        entry["completed_scan_count"] = len(entry.pop("_completed_rounds", set()))
        entry["checkpoint_names"] = entry["checkpoint_names"] or [entry["name"]]
        entry["status"] = "completed" if entry["completed_scan_count"] >= entry["required_scan_count"] else "pending"
        result.append(entry)

    result.sort(key=lambda item: item["name"].lower() if isinstance(item.get("name"), str) else str(item.get("name")))
    return result


def _store_alerts(store_id: str):
    alerts = list_alerts(store_id=store_id)
    return alerts


def _stale_time(scans: List[Dict[str, Any]]):
    if not scans:
        return "No scan activity"
    latest = _parse_dt(scans[0].get("server_timestamp") or scans[0].get("time"))
    if not latest:
        return None
    minutes = int((datetime.utcnow() - latest).total_seconds() / 60)
    return f"{minutes}m" if minutes else "just now"


def _compliance_from_scans(scans: List[Dict[str, Any]]) -> int:
    if not scans:
        return 0
    verified = len([scan for scan in scans if scan.get("scan_status") == "verified"])
    return round((verified / len(scans)) * 100)


def _compliance_history_from_scans(scans: List[Dict[str, Any]]):
    return _bucket_scans(scans)


def global_dashboard():
    stores = [_safe_store(store) for store in stores_container.read_all_items()]
    for store in stores:
        store_scans = get_scan_history(store["id"])
        store["compliance"] = store.get("compliance") or _compliance_from_scans(store_scans)
        store["nfcCount"] = len(list(tags_container.query_items(query="SELECT * FROM c WHERE c.store_id=@store_id", parameters=[{"name": "@store_id", "value": store["id"]}], enable_cross_partition_query=True)))
        store["activeAlerts"] = len([alert for alert in list_alerts(store_id=store["id"]) if not alert["reviewed"]])
        store["lastSync"] = _stale_time(store_scans)

    all_scans = list(scan_container.read_all_items())
    all_alerts = list_alerts()
    stats = {
        "stores": len(stores),
        "tags": len(list(tags_container.read_all_items())),
        "alerts": len(all_alerts),
        "compliance": round(sum(store["compliance"] for store in stores) / max(len(stores), 1)) if stores else 0,
    }
    return {
        "stats": stats,
        "stores": stores,
        "alert_summary": get_alert_summary(),
        "compliance_history": _compliance_history_from_scans(all_scans),
        "recent_alerts": all_alerts[:10],
    }


def store_dashboard(store_id: str):
    store = next((s for s in stores_container.read_all_items() if s.get("id") == store_id), None)
    if not store:
        return None

    store = _safe_store(store)
    scans = get_scan_history(store_id)
    alerts = _store_alerts(store_id)
    stored_rounds = _store_rounds(store_id)
    tag_stats = get_tag_stats(store_id)
    scan_stats = get_scan_stats(store_id)
    store["compliance"] = store.get("compliance") or _compliance_from_scans(scans)
    store["nfcCount"] = len(list(tags_container.query_items(query="SELECT * FROM c WHERE c.store_id=@store_id", parameters=[{"name": "@store_id", "value": store_id}], enable_cross_partition_query=True)))
    store["activeAlerts"] = len([alert for alert in alerts if not alert["reviewed"]])
    store["lastSync"] = _stale_time(scans)

    rounds = []
    for index, round_item in enumerate(stored_rounds):
        round_number = _round_number_from_item(round_item, index)
        completion_time = _round_completion_time(round_item)
        rounds.append(
            _round_to_view(
                {
                    **round_item,
                    "round_number": round_number,
                    "completed_by": round_item.get("staff") or round_item.get("employee_name"),
                    "completion_time": completion_time,
                },
                active=round_item.get("status") == "active",
            )
        )

    daily_rounds = int(store.get("daily_rounds", 0) or 0)
    if daily_rounds > len(rounds):
        for round_number in range(len(rounds) + 1, daily_rounds + 1):
            rounds.append(
                {
                    "id": f"{store_id}:round:{round_number}",
                    "name": f"Round {round_number}",
                    "time": None,
                    "staff": None,
                    "compliance": 0,
                    "totalScans": 0,
                    "completedScans": 0,
                    "isActive": False,
                    "checkpointItems": [],
                    "status": "pending",
                    "round_number": round_number,
                    "completed_by": None,
                    "completion_time": None,
                }
            )

    return {
        "store": store,
        "tag_stats": tag_stats,
        "scan_stats": scan_stats,
        "alert_summary": get_alert_summary(store_id),
        "compliance_history": _compliance_history_from_scans(scans),
        "rounds": rounds,
        "nfc_details": _nfc_details(store, stored_rounds),
        "alerts": alerts,
        "stale_time": _stale_time(scans),
    }


def cleaner_dashboard(user_id: str):
    user = next((u for u in users_container.read_all_items() if u.get("user_id") == user_id), None)
    if not user:
        return None

    store_id = user.get("store_id")
    store = next((s for s in stores_container.read_all_items() if s.get("id") == store_id), None) if store_id else None
    scans = get_scan_history(store_id) if store_id else []
    rounds = _store_rounds(store_id) if store_id else []
    active_round = next((r for r in rounds if r.get("status") == "active"), None)
    completed_rounds = [round_item for round_item in rounds if round_item.get("status") == "completed"]
    alerts = _store_alerts(store_id) if store_id else []
    configured_rounds = int(store.get("daily_rounds", 0) or 0) if store else 0
    required_checkpoints = int(store.get("checkpoint_count", 0) or 0) if store else 0

    compliance_history = store.get("complianceHistory") if store and store.get("complianceHistory") else _bucket_scans(scans)
    stats = {
        "today_scans": len(scans),
        "today_compliance": _compliance_from_scans(scans),
        "active_alerts": len([alert for alert in alerts if not alert["reviewed"]]),
        "completed_rounds": len(completed_rounds),
        "configured_rounds": configured_rounds,
        "required_checkpoints": required_checkpoints,
    }

    return {
        "user": {
            "user_id": user.get("user_id"),
            "name": user.get("name"),
            "username": user.get("username"),
            "role": user.get("role"),
            "store_id": store_id,
            "shift_start": user.get("shift_start"),
            "shift_end": user.get("shift_end"),
            "joined_at": user.get("joined_at"),
        },
        "store": _safe_store(store) if store else None,
        "current_round": _round_to_view(active_round, active=True) if active_round else None,
        "completed_rounds": [_round_to_view(round_item) for round_item in completed_rounds],
        "compliance_history": compliance_history,
        "stats": stats,
        "alerts": alerts,
    }
