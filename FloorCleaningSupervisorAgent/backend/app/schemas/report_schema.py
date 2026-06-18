from typing import List, Optional, Literal

from pydantic import BaseModel, Field


class ReportGenerateRequest(BaseModel):
    title: str = Field(min_length=3)
    context: Optional[str] = None
    report_types: List[str] = Field(default_factory=list)
    format: Literal["pdf", "csv"] = "pdf"
    start_date: str
    end_date: str
    store_id: Optional[str] = None


class ReportResponse(BaseModel):
    id: str
    title: str
    context: Optional[str] = None
    format: str
    start_date: str
    end_date: str
    report_types: List[str]
    download_url: str
    generated_at: str

