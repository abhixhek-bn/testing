from fastapi import APIRouter

from app.schemas.report_schema import ReportGenerateRequest
from app.services.report_service import generate_report, list_reports

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/generate")
def generate_report_route(payload: ReportGenerateRequest):
    return generate_report(payload)


@router.get("")
def fetch_reports(store_id: str | None = None):
    return list_reports(store_id)

