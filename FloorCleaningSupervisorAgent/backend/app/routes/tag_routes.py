from fastapi import APIRouter

from app.schemas.tag_schema import(
    RegisterTagRequest,
    AssignTagRequest,
    TagStatusUpdateRequest,
)

from app.services.tag_service import(
    register_tag,
    get_tags,
    get_tag,
    assign_tag_location,
    update_tag_status,
    delete_tag,
    reset_tags,
    get_tag_stats
)

router=APIRouter(
    prefix="/tags",
    tags=["Tags"]
)

@router.post("/register")
def create_tag(
    payload:RegisterTagRequest
):
    return register_tag(
        payload.store_id,
        payload.nfc_tag_uid
    )

@router.get("/")
def fetch_tags(store_id:str):
    return get_tags(store_id)

@router.get("/{tag_id}")
def fetch_tag(tag_id:str, store_id:str|None=None):
    return get_tag(tag_id, store_id)

@router.put("/{tag_id}/assign")
def assign_location(
    tag_id:str,
    payload:AssignTagRequest
):
    return assign_tag_location(
        tag_id,
        payload.store_id,
        payload.location,
        payload.area,
        payload.floor,
        payload.zone,
        payload.priority,
        payload.notes,
    )

@router.put("/{tag_id}/status")
def change_status(
    tag_id:str,
    payload:TagStatusUpdateRequest,
    store_id:str,
):
    return update_tag_status(tag_id, store_id, payload.status)

@router.delete("/{tag_id}")
def remove_tag(tag_id:str, store_id:str):
    return delete_tag(tag_id, store_id)

@router.delete("/reset/{store_id}")
def delete_tags(store_id:str):
    return reset_tags(store_id)

@router.get("/stats/{store_id}")
def fetch_stats(store_id:str):
    return get_tag_stats(store_id)
