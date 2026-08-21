from flask import Blueprint, jsonify, request
from pony.orm import db_session, select, commit
from app.models import Movie

api = Blueprint("api", __name__, url_prefix="/api")


def movie_to_dict(movie):
    return {
        "id": movie.id,
        "title": movie.title,
        "genre": movie.genre,
        "is_watched": movie.is_watched,
        "rating": movie.rating,
        "created_at": movie.created_at.isoformat(),
    }


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
        query = query.filter(lambda m: m.genre == genre)

    movies = query.order_by(lambda m: m.created_at)
    return jsonify([movie_to_dict(m) for m in movies])


# --- Add a movie to the wishlist ---
@api.route("/movies", methods=["POST"])
@db_session
def create_movie():
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    genre = (data.get("genre") or "").strip()

    if not title:
        return jsonify({"error": "Title is required."}), 400
    if not genre:
        return jsonify({"error": "Genre is required."}), 400

    movie = Movie(title=title, genre=genre)
    commit()

    return jsonify(movie_to_dict(movie)), 201


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

    # bool is a subclass of int, so {"rating": true} must be rejected explicitly
    if isinstance(rating, bool) or not isinstance(rating, int):
        return jsonify({"error": "Rating must be a whole number."}), 400

    if rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be between 1 and 5."}), 400

    movie.rating = rating
    commit()

    return jsonify(movie_to_dict(movie)), 200
