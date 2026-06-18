from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict

from app.core.database import reports_container
from app.services.alert_service import list_alerts
from app.services.dashboard_service import cleaner_dashboard, global_dashboard, store_dashboard
from app.services.scan_service import get_scan_history


def _now() -> str:
    return datetime.utcnow().isoformat()


def generate_report(data):
    report_id = str(uuid.uuid4())
    summary: Dict[str, Any]

    if data.store_id:
        summary = store_dashboard(data.store_id) or {}
    else:
        summary = global_dashboard()

    if data.store_id and "scan_stats" not in summary:
        summary["scan_stats"] = {"total_scans": len(get_scan_history(data.store_id))}
    if data.store_id and "alerts" not in summary:
        summary["alerts"] = list_alerts(data.store_id)

    report = {
        "id": report_id,
        "title": data.title,
        "context": data.context,
        "format": data.format,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "report_types": data.report_types,
        "store_id": data.store_id,
        "generated_at": _now(),
        "download_url": f"/reports/{report_id}/download",
        "summary": summary,
    }
    reports_container.create_item(report)
    return report


def list_reports(store_id: str | None = None):
    if store_id:
        items = list(
            reports_container.query_items(
                query="SELECT * FROM c WHERE c.store_id=@store_id",
                parameters=[{"name": "@store_id", "value": store_id}],
                enable_cross_partition_query=True,
            )
        )
    else:
        items = list(reports_container.read_all_items())
    items.sort(key=lambda item: item.get("generated_at", ""), reverse=True)
    return items

