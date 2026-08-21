# Movie Tracker

Movie Tracker is an application that lets users add movies to a wishlist of
things to watch, filter that list, and mark movies as watched while giving
them a rating from 1 to 5.

The project is built around its own web service. The HTML page is delivered
empty and filled in by JavaScript that calls the same public API, so the
service can be used entirely on its own.

## Features

- Add a movie to the wishlist: title, optional director, and one or more
  genres chosen from a fixed list
- List all movies, with filtering by watched status and by genre
- Edit a movie: title, director, genres, and the rating of a watched movie
- Mark a movie as watched
- Rate a watched movie from 1 to 5
- Delete a movie
- Statistics with data visualisation: totals, average rating, a watched vs.
  wishlist chart and a movies-per-genre chart
- Server side validation with meaningful error messages: a rating must be a
  whole number between 1 and 5, only a watched movie can be rated, and only
  known genres are accepted

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask |
| ORM | PonyORM |
| Database | SQLite |
| Frontend | HTML, CSS, vanilla JavaScript |
| Charts | Chart.js (bundled locally, no CDN) |
| Container | Docker |

## Running with Docker

Requires Docker. From the project root:

```bash
docker compose up --build
```

Then open <http://localhost:5001>.

To stop it, press `Ctrl+C`, or run `docker compose down` from another terminal.

The database file is stored in `data/`, which is mounted as a volume, so
movies added in the container are still there after a restart.

Without Compose, the equivalent is:

```bash
docker build -t movie-tracker .
docker run -p 5001:5001 -v "$(pwd)/data:/app/data" movie-tracker
```

## Running locally without Docker

Requires Python 3.12 or newer.

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Then open <http://127.0.0.1:5001>.

The database is created automatically on first start, so no setup step is
needed.

> On macOS port 5000 is taken by AirPlay Receiver, which is why this project
> uses 5001.

## API

All endpoints return JSON. Base path is `/api`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/movies` | List movies. Optional query parameters `is_watched=true\|false` and `genre=<name>`. A movie matches the genre filter when the genre is anywhere in its list. |
| `POST` | `/api/movies` | Add a movie. Body: `{"title": "...", "director": "...", "genres": ["..."]}`. `director` is optional, `genres` must hold at least one known genre. |
| `GET` | `/api/movies/<id>` | Get a single movie. |
| `PUT` | `/api/movies/<id>` | Edit title, director and genres. Optionally `"rating"`: a number sets it, `null` clears it, and leaving the key out keeps the current value. |
| `PATCH` | `/api/movies/<id>/watch` | Mark the movie as watched. |
| `PATCH` | `/api/movies/<id>/rating` | Rate the movie. Body: `{"rating": 1-5}` |
| `DELETE` | `/api/movies/<id>` | Delete the movie. |
| `GET` | `/api/genres` | The list of allowed genres. The page builds its genre picker from this, so the list is defined in one place only. |
| `GET` | `/api/stats` | Aggregated numbers used by the charts. A movie with two genres is counted under each of them. |

Errors are returned as `{"error": "..."}` with status `400` for invalid input
and `404` for a movie that does not exist.

Example:

```bash
curl -X POST http://localhost:5001/api/movies \
  -H "Content-Type: application/json" \
  -d '{"title": "Dune", "director": "Denis Villeneuve", "genres": ["Sci-Fi", "Drama"]}'
```

## Data model

A single table, `movies`:

| Column | Type | Notes |
|---|---|---|
| `id` | integer | primary key, assigned by the database |
| `title` | text | required |
| `director` | text | optional |
| `genres` | array of text | required, at least one known genre |
| `is_watched` | boolean | defaults to `false` |
| `rating` | integer | `NULL` until the movie is watched and rated |
| `created_at` | datetime | set automatically |

Genres are stored as a list in a single column using PonyORM's `StrArray`, so a
movie can belong to several genres at once.

The schema is created on first run and is never migrated afterwards. If the
model changes, delete `data/movies.db` and let it be created again.

## Project structure

```
main.py                  entry point: creates the Flask app and registers the blueprints
app/database.py          Database instance, SQLite path, init_db()
app/models.py            the Movie entity
app/api.py               JSON web service
app/views.py             serves the HTML page
app/templates/           HTML
app/static/              CSS, JavaScript, Chart.js
data/                    SQLite database file, created on first run
```
