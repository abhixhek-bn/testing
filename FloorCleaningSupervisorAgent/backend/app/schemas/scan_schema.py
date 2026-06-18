from typing import Optional, Literal

from pydantic import BaseModel, Field

class ScanRequest(BaseModel):
    nfc_tag_uid: str = Field(min_length=3)
    device_timestamp: str
    gps_lat: float
    gps_lon: float
    gps_accuracy: float
    shift_date: str
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    store_id: Optional[str] = None


class ScanResponse(BaseModel):
    status: Literal[
        "success",
        "unregistered_tag",
        "duplicate_scan",
        "gps_mismatch",
        "checkpoint_mismatch",
        "tag_inactive",
    ]
    message: str
    scan_id: Optional[str] = None
    store_id: Optional[str] = None
    checkpoint_id: Optional[str] = None
    alert_ids: list[str] = []
    compliance_status: Optional[str] = None


class ScanStatsResponse(BaseModel):
    total_scans: int
    verified_scans: int
    duplicate_scans: int
    fraud_scans: int
    pending_scans: int
