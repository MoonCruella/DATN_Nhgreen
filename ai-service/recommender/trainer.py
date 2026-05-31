import os
import pickle
from datetime import datetime

import numpy as np
from surprise import Dataset, Reader, SVD
from .config import MODEL_DIR, MODEL_PATH
from .data_loader import fetch_active_dishes, fetch_interactions


def retrain_model():
    interactions = fetch_interactions()
    if interactions.empty:
        raise ValueError("Không có dữ liệu đơn hàng hợp lệ")

    active_dishes = fetch_active_dishes()
    all_items = set(active_dishes["dish_id"].tolist())
    max_score = interactions["score"].max()
    reader = Reader(rating_scale=(0, max_score))
    dataset = Dataset.load_from_df(
        interactions[["user_id", "dish_id", "score"]],
        reader,
    )
    trainset = dataset.build_full_trainset()
    model = SVD()
    model.fit(trainset)

    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(
            {
                "model": model,
                "trainset": trainset,
                "all_items": list(all_items),
                "trained_at": datetime.utcnow(),
            },
            f,
        )

    return {
        "users": trainset.n_users,
        "dishes": trainset.n_items,
        "interactions": len(interactions),
    }