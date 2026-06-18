from fastapi import APIRouter, HTTPException

from app.schemas.alert_schema import AlertReviewRequest, AlertCreateRequest
from app.services.alert_service import create_alert, get_alert, get_alert_summary, list_alerts, mark_all_reviewed, review_alert

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("")
def fetch_alerts(store_id: str | None = None, reviewed: bool | None = None):
    return list_alerts(store_id=store_id, reviewed=reviewed)


@router.get("/summary")
def fetch_summary(store_id: str | None = None):
    return get_alert_summary(store_id)


@router.get("/{alert_id}")
def fetch_alert(alert_id: str, store_id: str | None = None):
    alert = get_alert(alert_id, store_id)
    if not alert:
        raise HTTPException(status_code=404, detail="alert not found")
    return alert


@router.post("")
def create_alert_route(payload: AlertCreateRequest):
    return create_alert(
        payload.store_id,
        payload.type,
        payload.category,
        payload.title,
        payload.description,
        payload.time,
        payload.location,
        payload.staff,
        payload.source_scan_id,
        payload.related_tag_uid,
        payload.related_checkpoint_id,
    )


@router.post("/{alert_id}/review")
def review_alert_route(alert_id: str, payload: AlertReviewRequest, store_id: str | None = None):
    alert = review_alert(alert_id, reviewed_by=payload.reviewed_by, store_id=store_id)
    if not alert:
        raise HTTPException(status_code=404, detail="alert not found")
    return alert


@router.post("/review-all/{store_id}")
def review_all_route(store_id: str, payload: AlertReviewRequest):
    return mark_all_reviewed(store_id, reviewed_by=payload.reviewed_by)

