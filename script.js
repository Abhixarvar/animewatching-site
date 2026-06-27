const API_BASE = 'https://api.jikan.moe/v4';
let currentAnimeList = [];
let bookmarks = JSON.parse(localStorage.getItem('animepulse_bookmarks')) || [];
let currentActiveTab = 'home';
let searchTimeout = null;

// DOM Elements
const animeGrid = document.getElementById('anime-grid');
const loadingSpinner = document.getElementById('loading-spinner');
const sectionTitle = document.getElementById('section-title');
const navLinks = document.querySelectorAll('.nav-links li');
const searchInput = document.getElementById('search-input');
const heroSection = document.getElementById('hero-section');

// Removed Modal Elements

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadHome();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Navigation Tabs
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const tab = e.currentTarget.getAttribute('data-tab');
            currentActiveTab = tab;
            
            if (tab === 'home') {
                heroSection.style.display = 'flex';
                searchInput.value = '';
                loadHome();
            } else if (tab === 'bookmarks') {
                heroSection.style.display = 'none';
                loadBookmarks();
            }
        });
    });

    // Logo click goes to home
    document.getElementById('nav-logo').addEventListener('click', () => {
        document.querySelector('[data-tab="home"]').click();
    });

    // Search Input
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length >= 3) {
            searchTimeout = setTimeout(() => {
                heroSection.style.display = 'none';
                searchAnime(query);
            }, 500); // Debounce
        } else if (query.length === 0 && currentActiveTab === 'home') {
            heroSection.style.display = 'flex';
            loadHome();
        }
    });



    // Hero buttons
    document.getElementById('hero-watch-btn').addEventListener('click', () => {
        if(currentAnimeList.length > 0) {
            window.location.href = `watch.html?id=${currentAnimeList[0].mal_id}`;
        }
    });
    
    document.getElementById('hero-bookmark-btn').addEventListener('click', (e) => {
        if(currentAnimeList.length > 0) {
            toggleBookmark(currentAnimeList[0]);
            updateHeroBookmarkBtn(currentAnimeList[0].mal_id);
        }
    });
}

// API Fetching
async function fetchAnime(endpoint) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching anime:', error);
        showToast('Failed to load anime. Please try again.');
        return [];
    } finally {
        showLoading(false);
    }
}

async function loadHome() {
    sectionTitle.textContent = "Currently Airing";
    animeGrid.innerHTML = '';
    
    // Fetch top airing for hero
    const topAnime = await fetchAnime('/top/anime?filter=airing&limit=10');
    if (topAnime && topAnime.length > 0) {
        setupHero(topAnime[0]);
        currentAnimeList = topAnime;
    }

    // Fetch seasonal for grid
    const seasonalAnime = await fetchAnime('/seasons/now?limit=20');
    if (seasonalAnime) {
        renderAnimeGrid(seasonalAnime);
    }
}

async function searchAnime(query) {
    sectionTitle.textContent = `Search Results for "${query}"`;
    const results = await fetchAnime(`/anime?q=${encodeURIComponent(query)}&limit=20`);
    renderAnimeGrid(results);
}

function loadBookmarks() {
    sectionTitle.textContent = "Your Bookmarks";
    if (bookmarks.length === 0) {
        animeGrid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center;">No bookmarks yet. Start adding some!</p>';
        return;
    }
    renderAnimeGrid(bookmarks);
}

// UI Rendering
function setupHero(anime) {
    document.getElementById('hero-title').textContent = anime.title_english || anime.title;
    document.getElementById('hero-synopsis').textContent = anime.synopsis || "No synopsis available.";
    
    const backdrop = document.querySelector('.hero-backdrop');
    // Jikan doesn't always have high-res banners, using large image
    const imgUrl = anime.trailer?.images?.maximum_image_url || anime.images.webp.large_image_url;
    backdrop.style.backgroundImage = `url('${imgUrl}')`;
    
    updateHeroBookmarkBtn(anime.mal_id);
}

function updateHeroBookmarkBtn(id) {
    const btn = document.getElementById('hero-bookmark-btn');
    if (isBookmarked(id)) {
        btn.classList.add('bookmarked');
        btn.innerHTML = '<i class="fa-solid fa-bookmark"></i>';
    } else {
        btn.classList.remove('bookmarked');
        btn.innerHTML = '<i class="fa-regular fa-bookmark"></i>';
    }
}

function renderAnimeGrid(animeArray) {
    animeGrid.innerHTML = '';
    
    if (!animeArray || animeArray.length === 0) {
        animeGrid.innerHTML = '<p>No results found.</p>';
        return;
    }

    animeArray.forEach(anime => {
        const card = document.createElement('div');
        card.className = 'anime-card';
        
        const score = anime.score ? `<div class="card-score"><i class="fa-solid fa-star"></i> ${anime.score}</div>` : '';
        const title = anime.title_english || anime.title;
        const type = anime.type || 'TV';
        const year = anime.year || (anime.aired && anime.aired.prop.from.year) || 'N/A';
        
        let statusBlip = '';
        const bookmark = bookmarks.find(b => b.mal_id === anime.mal_id);
        if (bookmark && bookmark.watch_status) {
            const statusClass = 'status-' + bookmark.watch_status.replace(/_/g, '').replace(/ /g, '').toLowerCase();
            statusBlip = `<div class="status-blip ${statusClass}" title="${bookmark.watch_status}"></div>`;
        }

        card.innerHTML = `
            <div class="card-image">
                <img src="${anime.images.webp.large_image_url}" alt="${title}" loading="lazy">
                ${score}
                ${statusBlip}
                <div class="card-overlay">
                    <i class="fa-solid fa-circle-play play-icon"></i>
                </div>
            </div>
            <div class="card-info">
                <div class="card-title" title="${title}">${title}</div>
                <div class="card-meta">
                    <span>${type}</span>
                    <span>${year}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            window.location.href = `watch.html?id=${anime.mal_id}`;
        });
        animeGrid.appendChild(card);
    });
}

// Removed Modal Logic

// Bookmarks Logic
function isBookmarked(id) {
    return bookmarks.some(b => b.mal_id === id);
}

function toggleBookmark(anime) {
    const index = bookmarks.findIndex(b => b.mal_id === anime.mal_id);
    let statusToSave = '';
    
    if (index > -1) {
        bookmarks.splice(index, 1);
        showToast('Removed from bookmarks');
    } else {
        // Only save necessary data to avoid quota issues
        const minimalAnime = {
            mal_id: anime.mal_id,
            title: anime.title,
            title_english: anime.title_english,
            images: { webp: { large_image_url: anime.images.webp.large_image_url } },
            score: anime.score,
            type: anime.type,
            year: anime.year,
            episodes: anime.episodes,
            status: anime.status,
            synopsis: anime.synopsis,
            watch_status: 'plan_to_watch'
        };
        bookmarks.push(minimalAnime);
        statusToSave = 'plan_to_watch';
        showToast('Added to bookmarks');
    }
    
    localStorage.setItem('animepulse_bookmarks', JSON.stringify(bookmarks));
    
    if (window.saveBookmarkToDatabase) {
        window.saveBookmarkToDatabase(anime.mal_id, statusToSave);
    }
    
    // If we are currently on the bookmarks tab, refresh it
    if (currentActiveTab === 'bookmarks') {
        loadBookmarks();
    }
    
    // If hero matches, update it
    if (currentAnimeList.length > 0 && currentAnimeList[0].mal_id === anime.mal_id) {
        updateHeroBookmarkBtn(anime.mal_id);
    }
}



// Utilities
function showLoading(show) {
    if (show) {
        loadingSpinner.classList.add('active');
        animeGrid.style.display = 'none';
    } else {
        loadingSpinner.classList.remove('active');
        animeGrid.style.display = 'grid';
    }
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
