const movieList = document.getElementById("movie-list");
const message = document.getElementById("message");
const addForm = document.getElementById("add-form");
const title = document.getElementById("title");
const director = document.getElementById("director");
const genrePicker = document.getElementById("genre-picker");
const filters = document.getElementById("filters");



let currentFilter = "all";
let allGenres = [];


// --- The list of genres comes from the API, so it is defined in one place ---
async function loadGenres() {
    const response = await fetch("/api/genres");
    allGenres = await response.json();
    buildGenrePicker(genrePicker, []);
}


// --- Fill a fieldset with one checkbox per genre ---
function buildGenrePicker(container, selected) {
    container.innerHTML = "<legend>Genres</legend>";

    for (const name of allGenres) {
        const label = document.createElement("label");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = name;
        checkbox.checked = selected.includes(name);

        label.appendChild(checkbox);
        label.append(name);
        container.appendChild(label);
    }
}


function selectedGenres(container) {
    const checked = container.querySelectorAll("input:checked");
    return Array.from(checked).map((box) => box.value);
}



// --- Load movies from the API and render them ---
async function loadMovies() {
    let url = "/api/movies";
    if (currentFilter !== "all") {
        url += "?is_watched=" + currentFilter;
    }

    const response = await fetch(url);
    const movies = await response.json();

    renderMovies(movies);
    loadStats();
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
            <div class="movie-meta"></div>
        </div>
        <div class="movie-actions"></div>
    `;

    card.querySelector(".movie-title").textContent = movie.title;

    const meta = card.querySelector(".movie-meta");

    for (const name of movie.genres) {
        const badge = document.createElement("span");
        badge.className = "genre";
        badge.textContent = name;
        meta.appendChild(badge);
    }

    if (movie.director) {
        const directorLabel = document.createElement("span");
        directorLabel.className = "director";
        directorLabel.textContent = movie.director;
        meta.appendChild(directorLabel);
    }

    if (movie.rating !== null) {
        const stars = document.createElement("span");
        stars.className = "stars";
        stars.textContent = "★".repeat(movie.rating) + "☆".repeat(5 - movie.rating);
        meta.appendChild(stars);
    }

    const actions = card.querySelector(".movie-actions");

    if (!movie.is_watched) {
        const watchButton = document.createElement("button");
        watchButton.className = "watch";
        watchButton.textContent = "Mark watched";
        watchButton.addEventListener("click", () => markWatched(movie.id));
        actions.appendChild(watchButton);
    }

    if (movie.is_watched && movie.rating === null) {
        const rateSelect = document.createElement("select");
        rateSelect.className = "rate-select";
        rateSelect.innerHTML = `
            <option value="" disabled selected>Rate</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
        `;
        rateSelect.addEventListener("change", (event) => {
            rateMovie(movie.id, Number(event.target.value));
        });
        actions.appendChild(rateSelect);
    }

    const editButton = document.createElement("button");
    editButton.className = "edit";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => showEditForm(card, movie));
    actions.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteMovie(movie.id));
    actions.appendChild(deleteButton);

    return card;
}


// --- Turn a card into an inline edit form ---
function showEditForm(card, movie) {
    card.innerHTML = "";

    const form = document.createElement("form");
    form.className = "edit-form";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = movie.title;
    titleInput.required = true;

    const directorInput = document.createElement("input");
    directorInput.type = "text";
    directorInput.placeholder = "Director (optional)";
    directorInput.value = movie.director;

    const picker = document.createElement("fieldset");
    picker.className = "genre-picker";
    buildGenrePicker(picker, movie.genres);

    form.append(titleInput, directorInput, picker);

    // Only a watched movie can carry a rating, so the control is offered
    // only then. The empty option clears the rating.
    let ratingSelect = null;
    if (movie.is_watched) {
        ratingSelect = document.createElement("select");
        ratingSelect.className = "rate-select";
        ratingSelect.innerHTML = `
            <option value="">Not rated</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
        `;
        ratingSelect.value = movie.rating === null ? "" : String(movie.rating);
        form.appendChild(ratingSelect);
    }

    const buttons = document.createElement("div");
    buttons.className = "edit-buttons";
    buttons.innerHTML = `
        <button type="submit" class="save">Save</button>
        <button type="button" class="cancel">Cancel</button>
    `;
    form.appendChild(buttons);

    card.appendChild(form);

    buttons.querySelector(".cancel").addEventListener("click", loadMovies);

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const payload = {
            title: titleInput.value.trim(),
            director: directorInput.value.trim(),
            genres: selectedGenres(picker)
        };

        if (ratingSelect) {
            payload.rating = ratingSelect.value === "" ? null : Number(ratingSelect.value);
        }

        updateMovie(movie.id, payload);
    });
}

function showMessage(text, isSuccess = false) {
    message.textContent = text;
    message.className = isSuccess ? "message success" : "message";
}

// --- Add a movie to the wishlist ---
async function addMovie(event) {
    event.preventDefault();

    const movieTitle = title.value.trim();
    const movieGenres = selectedGenres(genrePicker);

    if (!movieTitle) {
        showMessage("Title is required.");
        return;
    }
    if (movieGenres.length === 0) {
        showMessage("Pick at least one genre.");
        return;
    }

    const response = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: movieTitle,
            director: director.value.trim(),
            genres: movieGenres
        })
    });

    const data = await response.json();

    if (!response.ok) {
        showMessage(data.error);
        return;
    }

    title.value = "";
    director.value = "";
    buildGenrePicker(genrePicker, []);
    showMessage("Movie added.", true);
    loadMovies();
}


// --- Save an edited movie ---
async function updateMovie(id, payload) {
    const response = await fetch(`/api/movies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
        showMessage(data.error);
        return;
    }

    showMessage("Movie updated.", true);
    loadMovies();
}

async function markWatched(id) {
    const response = await fetch(`/api/movies/${id}/watch`, {
        method: "PATCH"
    });

    const data = await response.json();

    if (!response.ok) {
        showMessage(data.error);
        return;
    }

    loadMovies();
}

// --- Rate a watched movie ---
async function rateMovie(id, rating) {
    const response = await fetch(`/api/movies/${id}/rating`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: rating })
    });

    const data = await response.json();

    if (!response.ok) {
        showMessage(data.error);
        return;
    }

    loadMovies();
}

// --- Delete a movie ---
async function deleteMovie(id) {
    const response = await fetch(`/api/movies/${id}`, {
        method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok) {
        showMessage(data.error);
        return;
    }

    loadMovies();
}

// --- Filter buttons (one listener on the parent) ---
filters.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) {
        return;
    }

    for (const other of filters.querySelectorAll("button")) {
        other.classList.remove("active");
    }
    button.classList.add("active");

    currentFilter = button.dataset.filter;
    showMessage("");
    loadMovies();
});

addForm.addEventListener("submit", addMovie);


/* ---------------------------------------------------------------
   Statistics
   --------------------------------------------------------------- */

const statsSection = document.getElementById("stats");
const statTotal = document.getElementById("stat-total");
const statWatched = document.getElementById("stat-watched");
const statWishlist = document.getElementById("stat-wishlist");
const statAverage = document.getElementById("stat-average");

// Colours come from the chart surface, not from the page background,
// so the ring between segments reads as a gap.
const SURFACE = "#191d27";
const MUTED = "#949cad";
const GRID = "#2a3040";
const SERIES_1 = "#3987e5";
const SERIES_2 = "#d95926";

let statusChart = null;
let genreChart = null;

Chart.defaults.color = MUTED;
Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;


async function loadStats() {
    const response = await fetch("/api/stats");
    const stats = await response.json();

    // Nothing to visualise until there is at least one movie.
    statsSection.hidden = stats.total === 0;
    if (stats.total === 0) {
        return;
    }

    statTotal.textContent = stats.total;
    statWatched.textContent = stats.watched;
    statWishlist.textContent = stats.want_to_watch;
    statAverage.textContent = stats.average_rating === null ? "–" : stats.average_rating;

    renderStatusChart(stats);
    renderGenreChart(stats);
}


function renderStatusChart(stats) {
    const values = [stats.watched, stats.want_to_watch];

    if (statusChart) {
        statusChart.data.datasets[0].data = values;
        statusChart.update();
        return;
    }

    statusChart = new Chart(document.getElementById("status-chart"), {
        type: "doughnut",
        data: {
            labels: ["Watched", "Want to watch"],
            datasets: [{
                data: values,
                backgroundColor: [SERIES_1, SERIES_2],
                borderColor: SURFACE,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        boxWidth: 8,
                        boxHeight: 8,
                        padding: 16
                    }
                }
            }
        }
    });
}


function renderGenreChart(stats) {
    const labels = stats.by_genre.map((row) => row.genre);
    const values = stats.by_genre.map((row) => row.count);

    if (genreChart) {
        genreChart.data.labels = labels;
        genreChart.data.datasets[0].data = values;
        genreChart.update();
        return;
    }

    genreChart = new Chart(document.getElementById("genre-chart"), {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Movies",
                data: values,
                backgroundColor: SERIES_1,
                borderRadius: 4,
                borderSkipped: false,
                maxBarThickness: 22
            }]
        },
        options: {
            // Horizontal bars keep the genre names readable.
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                // One series only, so the caption above names it.
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, precision: 0 },
                    grid: { color: GRID }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}


loadGenres();
loadMovies();
