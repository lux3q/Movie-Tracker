const movieList = document.getElementById("movie-list");
const message = document.getElementById("message");
const addForm = document.getElementById("add-form");
const title = document.getElementById("title");
const genre = document.getElementById("genre");



let currentFilter = "all";



// --- Load movies from the API and render them ---
async function loadMovies() {
    let url = "/api/movies";
    if (currentFilter !== "all") {
        url += "?is_watched=" + currentFilter;
    }

    const response = await fetch(url);
    const movies = await response.json();

    renderMovies(movies);
}


// --- Build the list in the DOM ---
function renderMovies(movies) {
    movieList.innerHTML = "";

    if (movies.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No movies here yet.";
        movieList.appendChild(empty);
        return;
    }

    for (const movie of movies) {
        movieList.appendChild(createMovieCard(movie));
    }
}


function createMovieCard(movie) {
    const card = document.createElement("div");
    card.className = "movie";

    card.innerHTML = `
        <div class="movie-info">
            <div class="movie-title"></div>
            <div class="movie-meta">
                <span class="genre"></span>
            </div>
        </div>
        <div class="movie-actions"></div>
    `;

    card.querySelector(".movie-title").textContent = movie.title;
    card.querySelector(".genre").textContent = movie.genre;

    if (movie.rating !== null) {
        const stars = document.createElement("span");
        stars.className = "stars";
        stars.textContent = "★".repeat(movie.rating) + "☆".repeat(5 - movie.rating);
        card.querySelector(".movie-meta").appendChild(stars);
    }

    return card;
}

function showMessage(text, isSuccess = false) {
    message.textContent = text;
    message.className = isSuccess ? "message success" : "message";
}

// --- Add a movie to the wishlist ---
async function addMovie(event) {
    event.preventDefault();

    const movieTitle = title.value.trim();
    const movieGenre = genre.value.trim();

    if (!movieTitle || !movieGenre) {
        showMessage("Title and genre are required.");
        return;
    }

    const response = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: movieTitle, genre: movieGenre })
    });

    const data = await response.json();

    if (!response.ok) {
        showMessage(data.error);
        return;
    }

    title.value = "";
    genre.value = "";
    showMessage("Movie added.", true);
    loadMovies();
}

addForm.addEventListener("submit", addMovie);
loadMovies();
