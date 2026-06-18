from typing import Optional

from pydantic import BaseModel

class RegistrationReviewResponse(BaseModel):
    checkpoint_id: str
    checkpoint_name: str
    nfc_tag_uid: str
    gps_lat: float
    gps_lon: float
    radius: int = 15
    deployment_status: str
    is_active: bool
    store_id: Optional[str] = None
