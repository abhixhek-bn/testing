from __future__ import annotations

from app.services.checkpoint_service import cancel_checkpoint, deploy_checkpoint, get_checkpoint


class ReviewService:
    async def get_review(self, checkpoint_id: str):
        return get_checkpoint(checkpoint_id)

    async def deploy_checkpoint(self, checkpoint_id: str):
        return deploy_checkpoint(checkpoint_id)

    async def cancel_checkpoint(self, checkpoint_id: str):
        return cancel_checkpoint(checkpoint_id)

