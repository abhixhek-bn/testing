from fastapi import APIRouter
from app.schemas.scan_schema import ScanRequest
from app.services.scan_service import get_scan_history, get_scan_stats, process_scan

router = APIRouter()

@router.post("/scan")
def scan(data: ScanRequest):
    return process_scan(data)


@router.get("/scan/history/{store_id}")
def scan_history(store_id: str):
    return get_scan_history(store_id)


@router.get("/scan/stats/{store_id}")
def scan_stats(store_id: str):
    return get_scan_stats(store_id)
