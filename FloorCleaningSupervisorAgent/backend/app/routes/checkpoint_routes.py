from fastapi import APIRouter
from app.schemas.checkpoint_schema import CheckpointCreate
from app.services.checkpoint_service import create_checkpoint, get_checkpoint, list_checkpoints

router = APIRouter(prefix="/checkpoints", tags=["Checkpoints"])

@router.post("/")
def register_checkpoint(data: CheckpointCreate):
    return create_checkpoint(data)


@router.get("/{checkpoint_id}")
def fetch_checkpoint(checkpoint_id: str, store_id: str | None = None):
    return get_checkpoint(checkpoint_id, store_id)


@router.get("/")
def fetch_checkpoints(store_id: str | None = None):
    return list_checkpoints(store_id)
