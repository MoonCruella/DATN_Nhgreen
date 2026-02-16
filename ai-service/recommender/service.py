import os
import pickle
from typing import List

import numpy as np
from surprise import AlgoBase

from .config import MODEL_PATH
from .trainer import retrain_model
from .schemas import RecommendationResponse, SimilarDishResponse, RecommendationItem
from .data_loader import fetch_user_ordered_dishes


class RecommendationService:
    def __init__(self):
        self.model_bundle = None

    def ensure_model(self):
        if self.model_bundle is None:
            self.reload()

    def reload(self):
        if not os.path.exists(MODEL_PATH):
            retrain_model()
        with open(MODEL_PATH, "rb") as f:
            self.model_bundle = pickle.load(f)

    @property
    def model(self) -> AlgoBase:
        self.ensure_model()
        return self.model_bundle["model"]

    @property
    def trainset(self):
        self.ensure_model()
        return self.model_bundle["trainset"]

    @property
    def all_items(self) -> List[str]:
        self.ensure_model()
        return self.model_bundle["all_items"]

    def recommend_for_user(self, user_id: str, limit: int, exclude: List[str]) -> RecommendationResponse:
        self.ensure_model()
        trainset = self.trainset
        model = self.model
        
        # Query real-time orders từ MongoDB (CRITICAL: bao gồm cả orders sau khi train)
        ordered_dishes_raw = fetch_user_ordered_dishes(user_id)
        print(f"[recommend_for_user] User {user_id} ordered dishes (raw IDs): {len(ordered_dishes_raw)} dishes")
        
        # Check if user exists in trainset
        try:
            inner_uid = trainset.to_inner_uid(user_id)
            rated_items_inner = set(iid for (iid, _) in trainset.ur[inner_uid])
            print(f"[recommend_for_user] User {user_id} in trainset with {len(rated_items_inner)} rated items")
        except (ValueError, KeyError):
            rated_items_inner = set()
            print(f"[recommend_for_user] User {user_id} NOT in trainset (new user)")

        candidates = []
        excluded_count = 0
        for raw_iid in self.all_items:
            # Exclude dishes trong exclude list
            if raw_iid in exclude:
                excluded_count += 1
                continue
            
            # CRITICAL: Exclude dishes user đã order (real-time check)
            if raw_iid in ordered_dishes_raw:
                excluded_count += 1
                continue
            
            try:
                inner_iid = trainset.to_inner_iid(raw_iid)
            except ValueError:
                inner_iid = None
            
            # Double check: Skip items user rated trong trainset
            if inner_iid is not None and inner_iid in rated_items_inner:
                excluded_count += 1
                continue
            
            # Get prediction
            est = model.predict(user_id, raw_iid, clip=False).est
            candidates.append({"dish_id": raw_iid, "score": float(est)})

        print(f"[recommend_for_user] Excluded {excluded_count} dishes, {len(candidates)} candidates remaining")
        candidates.sort(key=lambda x: x["score"], reverse=True)
        return RecommendationResponse(user_id=user_id, recommendations=candidates[:limit])

    def get_similar_items(self, dish_id: str, limit: int) -> SimilarDishResponse:
        self.ensure_model()
        trainset = self.trainset
        model = self.model

        try:
            inner_iid = trainset.to_inner_iid(dish_id)
        except ValueError:
            return SimilarDishResponse(dish_id=dish_id, similar_items=[])

        embeddings = model.qi
        target_vec = embeddings[inner_iid]
        sims = embeddings @ target_vec
        norms = np.linalg.norm(embeddings, axis=1) * np.linalg.norm(target_vec)
        sims = sims / (norms + 1e-9)

        ranked = []
        for idx, sim in enumerate(sims):
            if idx == inner_iid:
                continue
            raw_iid = trainset.to_raw_iid(idx)
            ranked.append(RecommendationItem(dish_id=raw_iid, score=float(sim)))

        ranked.sort(key=lambda x: x.score, reverse=True)
        return SimilarDishResponse(dish_id=dish_id, similar_items=ranked[:limit])