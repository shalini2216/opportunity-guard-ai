from pymongo import MongoClient, ASCENDING, DESCENDING
from config import Config

client = None
db = None

def get_db():
    global client, db
    if db is None:
        client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client[Config.DB_NAME]
        init_indexes(db)
    return db

def init_indexes(database):
    """Ensure indexes exist for high-performance querying and uniqueness."""
    try:
        database.users.create_index([("email", ASCENDING)], unique=True)
        database.emails.create_index([("user_id", ASCENDING), ("provider_id", ASCENDING)], unique=True)
        database.emails.create_index([("user_id", ASCENDING), ("read_state", ASCENDING)])
        database.opportunities.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
        database.opportunities.create_index([("user_id", ASCENDING), ("deadline", ASCENDING)])
        database.reminders.create_index([("status", ASCENDING), ("schedule_time", ASCENDING)])
        database.notifications.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        database.audit_logs.create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)])
    except Exception as e:
        print(f"Index initialization warning: {e}")
