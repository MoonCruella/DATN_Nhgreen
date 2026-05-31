from typing import List, Optional
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str


class RetrainStats(BaseModel):
    users: int
    dishes: int
    interactions: int


class RetrainResponse(BaseModel):
    success: bool
    stats: RetrainStats


class RecommendationItem(BaseModel):
    dish_id: str
    score: float


class RecommendationResponse(BaseModel):
    user_id: str
    recommendations: List[RecommendationItem]


class SimilarDishResponse(BaseModel):
    dish_id: str
    similar_items: List[RecommendationItem]