from __future__ import annotations

from typing import Optional

from app.core.database import audit_logs_container


def list_audit_logs(store_id: Optional[str] = None, entity_type: Optional[str] = None):
    if store_id:
        items = list(
            audit_logs_container.query_items(
                query="SELECT * FROM c WHERE c.store_id=@store_id",
                parameters=[{"name": "@store_id", "value": store_id}],
                enable_cross_partition_query=True,
            )
        )
    else:
        items = list(audit_logs_container.read_all_items())

    if entity_type:
        items = [item for item in items if item.get("entity_type") == entity_type]

    items.sort(key=lambda item: item.get("timestamp", ""), reverse=True)
    return items

