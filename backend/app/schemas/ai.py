from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AIAnalysisRequest(BaseModel):
    trade_id: Optional[str] = None
    account_id: Optional[str] = None
    question: Optional[str] = None
    analysis_type: str = Field(default="general", description="Tipo de análise: general, trade, account, predict")


class AIAnalysisResponse(BaseModel):
    analysis: str
    suggestions: List[str]
    score: Optional[float] = None
    created_at: datetime
