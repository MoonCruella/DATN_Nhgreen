from typing import Tuple
import pandas as pd
from pymongo import MongoClient

from .config import MONGO_DB, MONGO_URI

STATUS_EXCLUDE = {"cancelled"}


def get_mongo_client() -> MongoClient:
    if not MONGO_URI:
        raise ValueError("Missing MONGO_URI")
    return MongoClient(MONGO_URI)


def fetch_interactions() -> pd.DataFrame:
    client = get_mongo_client()
    db = client[MONGO_DB]
    pipeline = [
        {"$match": {"status": {"$nin": list(STATUS_EXCLUDE)}}},
        {"$unwind": "$items"},
        {
            "$group": {
                "_id": {"user": "$user_id", "dish": "$items.dish_id"},
                "total_qty": {"$sum": "$items.quantity"},
                "order_count": {"$sum": 1},
            }
        },
    ]
    rows = list(db.orders.aggregate(pipeline))
    client.close()
    if not rows:
        return pd.DataFrame(columns=["user_id", "dish_id", "score"])
    data = [
        {
            "user_id": str(row["_id"]["user"]),
            "dish_id": str(row["_id"]["dish"]),
            "score": float(row["total_qty"]),
        }
        for row in rows
    ]
    return pd.DataFrame(data)


def fetch_active_dishes() -> pd.DataFrame:
    client = get_mongo_client()
    db = client[MONGO_DB]
    cursor = db.dishes.find({"status": "active"}, {"_id": 1})
    dish_ids = [str(doc["_id"]) for doc in cursor]
    client.close()
    return pd.DataFrame({"dish_id": dish_ids})


def fetch_user_ordered_dishes(user_id: str) -> set:
    """
    Query real-time orders từ MongoDB để lấy tất cả dish_ids user đã order.
    Dùng để exclude món đã đặt, kể cả sau khi train model.
    """
    from bson import ObjectId
    
    client = get_mongo_client()
    db = client[MONGO_DB]
    
    # Convert user_id to ObjectId
    try:
        user_oid = ObjectId(user_id)
    except:
        user_oid = user_id
    
    # Aggregation pipeline
    pipeline = [
        {
            "$match": {
                "user_id": user_oid,
                "status": {"$nin": list(STATUS_EXCLUDE)}
            }
        },
        {"$unwind": "$items"},
        {
            "$group": {
                "_id": "$items.dish_id"
            }
        }
    ]
    
    rows = list(db.orders.aggregate(pipeline))
    client.close()
    
    # Convert ObjectIds to strings
    result = {str(row["_id"]) for row in rows}
    print(f"[fetch_user_ordered_dishes] User {user_id} has ordered {len(result)} unique dishes")
    return result