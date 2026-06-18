from __future__ import annotations

import copy
import re
from typing import Any, Dict, Iterable, List, Optional

from azure.cosmos import CosmosClient, PartitionKey

from app.core.config import COSMOS_URL, COSMOS_KEY, DATABASE_NAME


class InMemoryContainer:
    def __init__(self, container_id: str, partition_key_path: str):
        self.id = container_id
        self.partition_key_path = partition_key_path
        self._items: Dict[str, Dict[str, Any]] = {}

    def _clone(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return copy.deepcopy(item)

    def _matches_partition(self, item: Dict[str, Any], partition_key: Any) -> bool:
        path = self.partition_key_path.lstrip("/")
        if not path:
            return True
        return item.get(path) == partition_key

    def create_item(self, body: Dict[str, Any]):
        item = self._clone(body)
        item_id = str(item["id"])
        self._items[item_id] = item
        return self._clone(item)

    def read_item(self, item: str, partition_key: Any):
        record = self._items.get(str(item))
        if record is None or not self._matches_partition(record, partition_key):
            raise KeyError(item)
        return self._clone(record)

    def read_all_items(self):
        for record in self._items.values():
            yield self._clone(record)

    def replace_item(self, item: str, body: Dict[str, Any]):
        record = self._clone(body)
        record["id"] = str(item)
        self._items[str(item)] = record
        return self._clone(record)

    def delete_item(self, item: str, partition_key: Any):
        record = self._items.get(str(item))
        if record is None or not self._matches_partition(record, partition_key):
            raise KeyError(item)
        del self._items[str(item)]

    def upsert_item(self, body: Dict[str, Any]):
        record = self._clone(body)
        self._items[str(record["id"])] = record
        return self._clone(record)

    def upsert_items(self, body: Dict[str, Any]):
        return self.upsert_item(body)

    def _parameter_map(self, parameters: Optional[Iterable[Dict[str, Any]]]) -> Dict[str, Any]:
        mapping: Dict[str, Any] = {}
        for param in parameters or []:
            name = str(param.get("name", ""))
            value = param.get("value")
            if name.startswith("@"):
                mapping[name] = value
                mapping[name.lstrip("@")] = value
        return mapping

    def _evaluate_clause(self, item: Dict[str, Any], clause: str, params: Dict[str, Any]) -> bool:
        clause = clause.strip()
        if not clause:
            return True

        param_match = re.match(r"(?i)c\.([A-Za-z0-9_]+)\s*=\s*@([A-Za-z0-9_]+)", clause)
        literal_match = re.match(r"(?i)c\.([A-Za-z0-9_]+)\s*=\s*'([^']*)'", clause)
        numeric_match = re.match(r"(?i)c\.([A-Za-z0-9_]+)\s*=\s*(\d+(?:\.\d+)?)", clause)

        if param_match:
            field, param_name = param_match.groups()
            expected = params.get(f"@{param_name}", params.get(param_name))
            return str(item.get(field)) == str(expected)

        if literal_match:
            field, expected = literal_match.groups()
            return str(item.get(field)) == expected

        if numeric_match:
            field, expected = numeric_match.groups()
            actual = item.get(field)
            try:
                return float(actual) == float(expected)
            except (TypeError, ValueError):
                return False

        return True

    def query_items(
        self,
        query: Optional[str] = None,
        parameters: Optional[Iterable[Dict[str, Any]]] = None,
        enable_cross_partition_query: bool = False,
    ):
        items = [self._clone(record) for record in self._items.values()]
        if not query:
            return items

        params = self._parameter_map(parameters)
        where_match = re.search(r"(?i)\bWHERE\b(.+)$", query)
        if not where_match:
            return items

        conditions = [
            part.strip()
            for part in re.split(r"(?i)\bAND\b", where_match.group(1))
            if part.strip()
        ]

        filtered = []
        for item in items:
            if all(self._evaluate_clause(item, clause, params) for clause in conditions):
                filtered.append(item)
        return filtered


class InMemoryDatabase:
    def __init__(self):
        self._containers: Dict[str, InMemoryContainer] = {}

    def create_container_if_not_exists(self, id: str, partition_key: PartitionKey):
        if id not in self._containers:
            self._containers[id] = InMemoryContainer(id, partition_key.path)
        return self._containers[id]


def _build_cosmos():
    client = CosmosClient(COSMOS_URL, COSMOS_KEY)
    database = client.create_database_if_not_exists(id=DATABASE_NAME or "FLOOR-CLEANER")

    return {
        "checkpoints_container": database.create_container_if_not_exists(
            id="checkpoints",
            partition_key=PartitionKey(path="/store_id"),
        ),
        "users_container": database.create_container_if_not_exists(
            id="USERS",
            partition_key=PartitionKey(path="/user_id"),
        ),
        "stores_container": database.create_container_if_not_exists(
            id="stores",
            partition_key=PartitionKey(path="/id"),
        ),
        "tags_container": database.create_container_if_not_exists(
            id="tags",
            partition_key=PartitionKey(path="/store_id"),
        ),
        "settings_container": database.create_container_if_not_exists(
            id="settings",
            partition_key=PartitionKey(path="/id"),
        ),
        "scan_container": database.create_container_if_not_exists(
            id="scan",
            partition_key=PartitionKey(path="/store_id"),
        ),
        "alerts_container": database.create_container_if_not_exists(
            id="alerts",
            partition_key=PartitionKey(path="/store_id"),
        ),
        "rounds_container": database.create_container_if_not_exists(
            id="rounds",
            partition_key=PartitionKey(path="/store_id"),
        ),
        "audit_logs_container": database.create_container_if_not_exists(
            id="audit_logs",
            partition_key=PartitionKey(path="/store_id"),
        ),
        "reports_container": database.create_container_if_not_exists(
            id="reports",
            partition_key=PartitionKey(path="/store_id"),
        ),
    }


def _build_memory():
    database = InMemoryDatabase()
    return {
        "checkpoints_container": database.create_container_if_not_exists("checkpoints", PartitionKey(path="/store_id")),
        "users_container": database.create_container_if_not_exists("USERS", PartitionKey(path="/user_id")),
        "stores_container": database.create_container_if_not_exists("stores", PartitionKey(path="/id")),
        "tags_container": database.create_container_if_not_exists("tags", PartitionKey(path="/store_id")),
        "settings_container": database.create_container_if_not_exists("settings", PartitionKey(path="/id")),
        "scan_container": database.create_container_if_not_exists("scan", PartitionKey(path="/store_id")),
        "alerts_container": database.create_container_if_not_exists("alerts", PartitionKey(path="/store_id")),
        "rounds_container": database.create_container_if_not_exists("rounds", PartitionKey(path="/store_id")),
        "audit_logs_container": database.create_container_if_not_exists("audit_logs", PartitionKey(path="/store_id")),
        "reports_container": database.create_container_if_not_exists("reports", PartitionKey(path="/store_id")),
    }


def _env_configured() -> bool:
    return bool(COSMOS_URL and COSMOS_KEY and not COSMOS_URL.startswith("YOUR_") and not COSMOS_KEY.startswith("YOUR_"))


try:
    if _env_configured():
        containers = _build_cosmos()
    else:
        raise RuntimeError("COSMOS_URL/COSMOS_KEY are not configured")
except Exception as exc:  # pragma: no cover - local fallback
    print(f"[database] Using in-memory fallback datastore: {exc}")
    containers = _build_memory()

checkpoints_container = containers["checkpoints_container"]
users_container = containers["users_container"]
stores_container = containers["stores_container"]
tags_container = containers["tags_container"]
settings_container = containers["settings_container"]
scan_container = containers["scan_container"]
alerts_container = containers["alerts_container"]
rounds_container = containers["rounds_container"]
audit_logs_container = containers["audit_logs_container"]
reports_container = containers["reports_container"]
