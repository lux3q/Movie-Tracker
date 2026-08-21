# Movie Tracker

Movie Tracker is an application that lets users add movies to a wishlist of
things to watch, filter that list, and mark movies as watched while giving
them a rating from 1 to 5.

## Features

- Add a movie: title, optional director, and one or more genres
- List movies, filtered by watched status or by genre
- Mark a movie as watched
- Rate a watched movie from 1 to 5
- Edit a movie, including its rating
- Delete a movie
- Statistics with two charts: watched vs wishlist, and movies per genre

## Running with Docker

```bash
docker compose up --build
```

Then open <http://localhost:5001>. Stop it with `Ctrl+C`.

The database file lives in `data/`, which is mounted as a volume, so movies
added inside the container are still there after it is restarted.

## Running locally

Requires Python 3.12 or newer.

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Then open <http://127.0.0.1:5001>. The database is created on first start, so
there is no setup step.

> Port 5001 is used because on macOS port 5000 is taken by AirPlay Receiver.

## API

All endpoints return JSON.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/movies` | List movies. Optional `?is_watched=true\|false` and `?genre=<name>`. |
| `POST` | `/api/movies` | Add a movie. Body: `{"title": "...", "director": "...", "genres": ["..."]}` |
| `GET` | `/api/movies/<id>` | Get a single movie. |
| `PUT` | `/api/movies/<id>` | Edit title, director, genres and optionally the rating. |
| `PATCH` | `/api/movies/<id>/watch` | Mark the movie as watched. |
| `PATCH` | `/api/movies/<id>/rating` | Rate the movie. Body: `{"rating": 1-5}` |
| `DELETE` | `/api/movies/<id>` | Delete the movie. |
| `GET` | `/api/genres` | The allowed genres. |
| `GET` | `/api/stats` | Numbers used by the charts. |

Errors come back as `{"error": "..."}` with `400` for invalid input and `404`
for a movie that does not exist.

```bash
curl -X POST http://localhost:5001/api/movies \
  -H "Content-Type: application/json" \
  -d '{"title": "Dune", "director": "Denis Villeneuve", "genres": ["Sci-Fi"]}'
```

## Database

One table, `movies`, with the columns `id`, `title`, `director`, `genres`,
`is_watched`, `rating` and `created_at`. Genres are stored as a list in a
single column, so a movie can belong to more than one genre.

The table is created on first run and is never migrated. If the model changes,
delete `data/movies.db` and let it be created again.
