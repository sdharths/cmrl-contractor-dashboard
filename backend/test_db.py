from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client.get_default_database()
    print(f"Connected to database: {db.name}")
    print(f"Collections: {db.list_collection_names()}")
except Exception as e:
    print(f"Connection failed: {e}")
