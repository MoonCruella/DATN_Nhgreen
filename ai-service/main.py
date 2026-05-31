import os
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

from recommender.trainer import retrain_model
from recommender.service import RecommendationService
from recommender.schemas import (
    HealthResponse,
    RetrainResponse,
    RecommendationResponse,
    SimilarDishResponse,
)

API_KEY = os.getenv("AI_API_KEY")
app = FastAPI(title="AI Recommendation Service", version="1.0.0")
recommender = RecommendationService()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_api_key(x_api_key: str = Header(...)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    recommender.ensure_model()
    return HealthResponse(status="ok")


@app.post("/retrain", response_model=RetrainResponse, dependencies=[Depends(verify_api_key)])
def retrain() -> RetrainResponse:
    stats = retrain_model()
    recommender.reload()
    return RetrainResponse(success=True, stats=stats)


@app.get(
    "/recommendations/{user_id}",
    response_model=RecommendationResponse,
    dependencies=[Depends(verify_api_key)],
)
def recommend(
    user_id: str,
    limit: int = Query(default=10, ge=1, le=50),
    exclude_dish_ids: Optional[List[str]] = Query(default=None),
) -> RecommendationResponse:
    return recommender.recommend_for_user(user_id, limit, exclude_dish_ids or [])


@app.get(
    "/similar-dishes/{dish_id}",
    response_model=SimilarDishResponse,
    dependencies=[Depends(verify_api_key)],
)
def similar_dishes(
    dish_id: str,
    limit: int = Query(default=10, ge=1, le=50),
) -> SimilarDishResponse:
    return recommender.get_similar_items(dish_id, limit)