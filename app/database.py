import os
from pony.orm import Database

db = Database()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "movies.db")

def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    from app import models
    db.bind(provider="sqlite", filename=DB_PATH, create_db=True)
    db.generate_mapping(create_tables=True)
