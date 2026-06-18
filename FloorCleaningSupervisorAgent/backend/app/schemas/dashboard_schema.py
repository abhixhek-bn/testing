from typing import Optional, List

from pydantic import BaseModel

from app.schemas.alert_schema import AlertResponse, AlertSummaryResponse
from app.schemas.scan_schema import ScanStatsResponse
from app.schemas.tag_schema import TagStatsResponse


class DashboardStats(BaseModel):
    stores: int
    tags: int
    alerts: int
    compliance: int


class StoreDashboardResponse(BaseModel):
    store: dict
    tag_stats: TagStatsResponse
    scan_stats: ScanStatsResponse
    alert_summary: AlertSummaryResponse
    compliance_history: List[dict]
    rounds: List[dict]
    alerts: List[AlertResponse]
    stale_time: Optional[str] = None


class GlobalDashboardResponse(BaseModel):
    stats: DashboardStats
    stores: List[dict]
    alert_summary: AlertSummaryResponse
    compliance_history: List[dict]
    recent_alerts: List[AlertResponse]


class CleanerDashboardResponse(BaseModel):
    user: dict
    store: Optional[dict] = None
    current_round: Optional[dict] = None
    completed_rounds: List[dict]
    compliance_history: List[dict]
    stats: dict
    alerts: List[AlertResponse]

