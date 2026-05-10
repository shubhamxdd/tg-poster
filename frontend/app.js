const API_BASE_URL = 'http://localhost:3000/api';
const movieGrid = document.getElementById('movie-grid');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');

let currentFilters = {
    search: '',
    type: ''
};

async function fetchMovies() {
    movieGrid.innerHTML = '<div class="loading">Loading movies...</div>';
    
    try {
        const queryParams = new URLSearchParams({
            search: currentFilters.search,
            type: currentFilters.type
        });

        const response = await fetch(`${API_BASE_URL}/movies?${queryParams}`);
        const data = await response.json();
        
        renderMovies(data.movies);
    } catch (error) {
        console.error('Error fetching movies:', error);
        movieGrid.innerHTML = '<div class="loading">Error loading movies. Make sure the backend is running.</div>';
    }
}

function renderMovies(movies) {
    if (movies.length === 0) {
        movieGrid.innerHTML = '<div class="loading">No movies found.</div>';
        return;
    }

    movieGrid.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="window.open('${movie.link}', '_blank')">
            <img src="${movie.poster || 'https://via.placeholder.com/200x300?text=No+Poster'}" alt="${movie.title}">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span>${movie.year || 'N/A'}</span>
                    <span class="badge">${movie.type}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Event Listeners
searchInput.addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    fetchMovies();
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilters.type = btn.dataset.type;
        fetchMovies();
    });
});

// Initial fetch
fetchMovies();
