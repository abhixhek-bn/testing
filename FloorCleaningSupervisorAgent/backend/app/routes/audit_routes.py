from fastapi import APIRouter

from app.services.audit_service import list_audit_logs

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("")
def fetch_audit_logs(store_id: str | None = None, entity_type: str | None = None):
    return list_audit_logs(store_id=store_id, entity_type=entity_type)

