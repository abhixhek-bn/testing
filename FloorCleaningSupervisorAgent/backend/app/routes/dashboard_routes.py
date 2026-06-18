from fastapi import APIRouter, HTTPException

from app.services.dashboard_service import cleaner_dashboard, global_dashboard, store_dashboard

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/global")
def fetch_global_dashboard():
    return global_dashboard()


@router.get("/stores/{store_id}")
def fetch_store_dashboard(store_id: str):
    data = store_dashboard(store_id)
    if not data:
        raise HTTPException(status_code=404, detail="store not found")
    return data


@router.get("/cleaner/{user_id}")
def fetch_cleaner_dashboard(user_id: str):
    data = cleaner_dashboard(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="user not found")
    return data

