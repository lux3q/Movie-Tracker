from flask import Blueprint, jsonify, request
from pony.orm import db_session, select, commit, count, avg
from app.models import Movie

api = Blueprint("api", __name__, url_prefix="/api")

GENRES = {
    "Action", "Animation", "Comedy", "Documentary", "Drama",
    "Horror", "Romance", "Sci-Fi", "Thriller",
}


def movie_to_dict(movie):
    return {
        "id": movie.id,
        "title": movie.title,
        "director": movie.director,
        # genres is a Pony TrackedArray, so convert it to a plain list.
        "genres": list(movie.genres),
        "is_watched": movie.is_watched,
        "rating": movie.rating,
        "created_at": movie.created_at.isoformat(),
    }


def clean_genres(value):
    """Validate the genre list and return it without duplicates.

    Returns (genres, error). Exactly one of the two is meaningful.
    """
    if not isinstance(value, list):
        return None, "Genres must be a list."

    genres = []
    for item in value:
        if not isinstance(item, str):
            return None, "Genres must be a list of names."
        item = item.strip()
        if item not in GENRES:
            return None, "Unknown genre."
        if item not in genres:
            genres.append(item)

    if not genres:
        return None, "At least one genre is required."

    return genres, None


def check_rating(value):
    """Validate a rating value. Returns an error message, or None if valid."""
    # bool is a subclass of int, so {"rating": true} must be rejected explicitly
    if isinstance(value, bool) or not isinstance(value, int):
        return "Rating must be a whole number."
    if value < 1 or value > 5:
        return "Rating must be between 1 and 5."
    return None


# --- The genres the frontend is allowed to offer ---
@api.route("/genres", methods=["GET"])
def get_genres():
    return jsonify(sorted(GENRES))


# --- List movies, optionally filtered by watched status and genre ---
@api.route("/movies", methods=["GET"])
@db_session
def get_movies():
    query = select(m for m in Movie)

    is_watched = request.args.get("is_watched")
    if is_watched == "true":
        query = query.filter(lambda m: m.is_watched == True)
    elif is_watched == "false":
        query = query.filter(lambda m: m.is_watched == False)

    genre = request.args.get("genre")
    if genre:
        # A movie matches when the genre is anywhere in its list.
        query = query.filter(lambda m: genre in m.genres)

    movies = query.order_by(lambda m: m.created_at)
    return jsonify([movie_to_dict(m) for m in movies])


# --- Add a movie to the wishlist ---
@api.route("/movies", methods=["POST"])
@db_session
def create_movie():
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    director = (data.get("director") or "").strip()

    if not title:
        return jsonify({"error": "Title is required."}), 400

    genres, error = clean_genres(data.get("genres") or [])
    if error:
        return jsonify({"error": error}), 400

    movie = Movie(title=title, director=director, genres=genres)
    commit()

    return jsonify(movie_to_dict(movie)), 201


# --- Get a single movie ---
@api.route("/movies/<int:movie_id>", methods=["GET"])
@db_session
def get_movie(movie_id):
    movie = Movie.get(id=movie_id)
    if movie is None:
        return jsonify({"error": "Movie not found."}), 404

    return jsonify(movie_to_dict(movie)), 200


# --- Edit a movie's title, director, genres and rating ---
@api.route("/movies/<int:movie_id>", methods=["PUT"])
@db_session
def update_movie(movie_id):
    movie = Movie.get(id=movie_id)
    if movie is None:
        return jsonify({"error": "Movie not found."}), 404

    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    director = (data.get("director") or "").strip()

    if not title:
        return jsonify({"error": "Title is required."}), 400

    genres, error = clean_genres(data.get("genres") or [])
    if error:
        return jsonify({"error": error}), 400

    # Rating is optional here: leave it alone when the key is missing,
    # clear it when it is null, otherwise validate it as usual.
    rating = movie.rating
    if "rating" in data:
        rating = data["rating"]
        if rating is not None:
            if not movie.is_watched:
                return jsonify({"error": "Only a watched movie can be rated."}), 400
            error = check_rating(rating)
            if error:
                return jsonify({"error": error}), 400

    movie.title = title
    movie.director = director
    movie.genres = genres
    movie.rating = rating
    commit()

    return jsonify(movie_to_dict(movie)), 200


# --- Delete a movie ---
@api.route("/movies/<int:movie_id>", methods=["DELETE"])
@db_session
def delete_movie(movie_id):
    movie = Movie.get(id=movie_id)
    if movie is None:
        return jsonify({"error": "Movie not found."}), 404

    movie.delete()
    return jsonify({"message": "Movie deleted."}), 200


# --- Mark a movie as watched ---
@api.route("/movies/<int:movie_id>/watch", methods=["PATCH"])
@db_session
def mark_as_watched(movie_id):
    movie = Movie.get(id=movie_id)
    if movie is None:
        return jsonify({"error": "Movie not found."}), 404

    if movie.is_watched:
        return jsonify({"error": "Movie is already marked as watched."}), 400

    movie.is_watched = True
    commit()

    return jsonify(movie_to_dict(movie)), 200


# --- Rate a watched movie from 1 to 5 ---
@api.route("/movies/<int:movie_id>/rating", methods=["PATCH"])
@db_session
def rate_movie(movie_id):
    movie = Movie.get(id=movie_id)
    if movie is None:
        return jsonify({"error": "Movie not found."}), 404

    if not movie.is_watched:
        return jsonify({"error": "Only a watched movie can be rated."}), 400

    data = request.get_json(silent=True) or {}
    rating = data.get("rating")

    error = check_rating(rating)
    if error:
        return jsonify({"error": error}), 400

    movie.rating = rating
    commit()

    return jsonify(movie_to_dict(movie)), 200


# --- Aggregated numbers for the charts ---
@api.route("/stats", methods=["GET"])
@db_session
def get_stats():
    total = count(m for m in Movie)
    watched = count(m for m in Movie if m.is_watched)
    average = avg(m.rating for m in Movie if m.rating is not None)

    # Genres live in an array column, so SQL cannot group by them.
    # A movie with two genres is counted once under each.
    tally = {}
    for movie_genres in select(m.genres for m in Movie):
        for genre in movie_genres:
            tally[genre] = tally.get(genre, 0) + 1

    by_genre = sorted(tally.items(), key=lambda row: -row[1])

    return jsonify({
        "total": total,
        "watched": watched,
        "want_to_watch": total - watched,
        "average_rating": round(average, 2) if average is not None else None,
        "by_genre": [{"genre": genre, "count": n} for genre, n in by_genre],
    })
