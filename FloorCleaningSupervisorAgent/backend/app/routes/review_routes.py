from fastapi import APIRouter, HTTPException

from app.services.review_service import ReviewService

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get("/registration-review/{checkpoint_id}")
async def get_registration_review(checkpoint_id: str):
    service = ReviewService()

    result = await service.get_review(checkpoint_id)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="checkpoint not found"
        )

    return result


@router.post("/deploy-checkpoint/{checkpoint_id}")
async def deploy_checkpoint(checkpoint_id: str):
    service = ReviewService()

    result = await service.deploy_checkpoint(checkpoint_id)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="checkpoint not found"
        )

    return {
        "message": "Checkpoint deployed",
        "data": result
    }


@router.post("/cancel-checkpoint/{checkpoint_id}")
async def cancel_checkpoint(checkpoint_id: str):
    service = ReviewService()

    result = await service.cancel_checkpoint(checkpoint_id)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="checkpoint not found"
        )

    return {
        "message": "Checkpoint cancelled",
        "data": result
    }
