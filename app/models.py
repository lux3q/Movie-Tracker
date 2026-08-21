from datetime import datetime
from pony.orm import Required, Optional, PrimaryKey, StrArray
from app.database import db

class Movie(db.Entity):
    _table_ = "movies"
    id = PrimaryKey(int, auto=True)
    title = Required(str)
    director = Optional(str)
    genres = Required(StrArray)
    is_watched = Required(bool, default=False)
    rating = Optional(int, nullable=True)
    created_at = Required(datetime, default=datetime.now)
