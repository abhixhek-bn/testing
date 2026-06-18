from fastapi import FastAPI

from app.routes import (
    alert_routes,
    audit_routes,
    auth_routes,
    checkpoint_routes,
    dashboard_routes,
    report_routes,
    review_routes,
    scan_routes,
    settings_routes,
    store_routes,
    tag_routes,
    user_routes,
)
from app.core.database import checkpoints_container

app = FastAPI(title="Floor Cleaning Supervisor API")

app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(store_routes.router)
app.include_router(tag_routes.router)
app.include_router(checkpoint_routes.router)
app.include_router(review_routes.router)
app.include_router(scan_routes.router)
app.include_router(alert_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(report_routes.router)
app.include_router(settings_routes.router)
app.include_router(audit_routes.router)


@app.get("/test-db")
def test_db():
    try:
        items = list(checkpoints_container.read_all_items())
        return {"status": "connected", "count": len(items)}
    except Exception as e:
        return {"error": str(e)}

