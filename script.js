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

// Modal Elements
const playerModal = document.getElementById('player-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalMeta = document.getElementById('modal-meta');
const modalSynopsis = document.getElementById('modal-synopsis');
const modalBookmarkBtn = document.getElementById('modal-bookmark-btn');
const episodesList = document.getElementById('episodes-list');
const audioToggles = document.querySelectorAll('.toggle-btn');
const mockVideo = document.getElementById('mock-video');
const playerLoading = document.getElementById('player-loading');
let currentModalAnime = null;

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

    // Modal Close
    closeModalBtn.addEventListener('click', closeModal);
    playerModal.addEventListener('click', (e) => {
        if (e.target === playerModal) closeModal();
    });

    // Audio Toggles
    audioToggles.forEach(btn => {
        btn.addEventListener('click', (e) => {
            audioToggles.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            simulateVideoLoad();
        });
    });

    // Modal Bookmark Toggle
    modalBookmarkBtn.addEventListener('click', () => {
        if (currentModalAnime) {
            toggleBookmark(currentModalAnime);
            updateModalBookmarkState(currentModalAnime.mal_id);
        }
    });

    // Hero buttons
    document.getElementById('hero-watch-btn').addEventListener('click', () => {
        if(currentAnimeList.length > 0) {
            openModal(currentAnimeList[0]); // First item in top list
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

        card.innerHTML = `
            <div class="card-image">
                <img src="${anime.images.webp.large_image_url}" alt="${title}" loading="lazy">
                ${score}
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

        card.addEventListener('click', () => openModal(anime));
        animeGrid.appendChild(card);
    });
}

// Modal & Player Logic
function openModal(anime) {
    currentModalAnime = anime;
    const title = anime.title_english || anime.title;
    
    modalTitle.textContent = title;
    modalSynopsis.textContent = anime.synopsis || "No synopsis available.";
    
    const episodes = anime.episodes || 12; // Fallback if unknown
    const status = anime.status;
    const score = anime.score || 'N/A';
    
    modalMeta.innerHTML = `
        <span class="meta-badge"><i class="fa-solid fa-star" style="color: gold;"></i> ${score}</span>
        <span class="meta-badge">${anime.type || 'TV'}</span>
        <span class="meta-badge">${status}</span>
        <span class="meta-badge">${episodes} EPS</span>
    `;

    updateModalBookmarkState(anime.mal_id);
    renderEpisodes(episodes);
    simulateVideoLoad();
    
    playerModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
}

function closeModal() {
    playerModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    mockVideo.pause();
    currentModalAnime = null;
}

function renderEpisodes(total) {
    episodesList.innerHTML = '';
    // Display up to 24 episodes for UI purposes if unknown
    const count = total ? Math.min(total, 100) : 12; 
    
    for (let i = 1; i <= count; i++) {
        const btn = document.createElement('button');
        btn.className = `ep-btn ${i === 1 ? 'playing' : ''}`;
        btn.textContent = `EP ${i}`;
        
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('playing'));
            e.target.classList.add('playing');
            simulateVideoLoad();
        });
        
        episodesList.appendChild(btn);
    }
}

function simulateVideoLoad() {
    mockVideo.pause();
    playerLoading.classList.add('active');
    
    // Simulate network delay for fetching stream
    setTimeout(() => {
        playerLoading.classList.remove('active');
        // We just leave the mock video ready to play
    }, 1500);
}

// Bookmarks Logic
function isBookmarked(id) {
    return bookmarks.some(b => b.mal_id === id);
}

function toggleBookmark(anime) {
    const index = bookmarks.findIndex(b => b.mal_id === anime.mal_id);
    
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
            synopsis: anime.synopsis
        };
        bookmarks.push(minimalAnime);
        showToast('Added to bookmarks');
    }
    
    localStorage.setItem('animepulse_bookmarks', JSON.stringify(bookmarks));
    
    // If we are currently on the bookmarks tab, refresh it
    if (currentActiveTab === 'bookmarks') {
        loadBookmarks();
    }
    
    // If hero matches, update it
    if (currentAnimeList.length > 0 && currentAnimeList[0].mal_id === anime.mal_id) {
        updateHeroBookmarkBtn(anime.mal_id);
    }
}

function updateModalBookmarkState(id) {
    if (isBookmarked(id)) {
        modalBookmarkBtn.classList.add('bookmarked');
        modalBookmarkBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i>';
    } else {
        modalBookmarkBtn.classList.remove('bookmarked');
        modalBookmarkBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i>';
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
