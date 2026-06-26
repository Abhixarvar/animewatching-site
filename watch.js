const API_BASE = 'https://api.jikan.moe/v4';
let currentAnime = null;
let bookmarks = JSON.parse(localStorage.getItem('animepulse_bookmarks')) || [];
let currentBookmark = null;
let selectedEpisode = null;

// DOM Elements
const statusSelect = document.getElementById('status-select');
const platformModal = document.getElementById('platform-modal');
const closePlatformBtn = document.getElementById('close-platform-btn');
const crunchyrollBtn = document.getElementById('crunchyroll-btn');
const youtubeBtn = document.getElementById('youtube-btn');
const platformModalTitle = document.getElementById('platform-modal-title');

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');

    if (animeId) {
        currentBookmark = bookmarks.find(b => b.mal_id == animeId) || null;
        if (currentBookmark && currentBookmark.watch_status) {
            statusSelect.value = currentBookmark.watch_status;
        }

        setupEventListeners(animeId);
        fetchAnimeDetails(animeId);
        fetchEpisodes(animeId);
        fetchRelations(animeId);
    } else {
        window.location.href = 'index.html';
    }
});

function setupEventListeners(animeId) {
    statusSelect.addEventListener('change', (e) => {
        const newStatus = e.target.value;
        if (newStatus === "") {
            // Remove bookmark
            bookmarks = bookmarks.filter(b => b.mal_id != animeId);
            currentBookmark = null;
        } else {
            // Add or update bookmark
            if (currentBookmark) {
                currentBookmark.watch_status = newStatus;
            } else if (currentAnime) {
                currentBookmark = {
                    mal_id: currentAnime.mal_id,
                    title: currentAnime.title,
                    title_english: currentAnime.title_english,
                    images: { webp: { large_image_url: currentAnime.images.webp.large_image_url } },
                    score: currentAnime.score,
                    type: currentAnime.type,
                    year: currentAnime.year || (currentAnime.aired && currentAnime.aired.prop.from.year) || 'N/A',
                    episodes: currentAnime.episodes,
                    status: currentAnime.status,
                    synopsis: currentAnime.synopsis,
                    watch_status: newStatus
                };
                bookmarks.push(currentBookmark);
            }
        }
        localStorage.setItem('animepulse_bookmarks', JSON.stringify(bookmarks));
    });

    closePlatformBtn.addEventListener('click', () => {
        platformModal.classList.remove('active');
    });

    platformModal.addEventListener('click', (e) => {
        if (e.target === platformModal) {
            platformModal.classList.remove('active');
        }
    });
}

async function fetchAnimeDetails(id) {
    const spinner = document.getElementById('loading-spinner');
    const container = document.getElementById('watch-container');
    
    try {
        const response = await fetch(`${API_BASE}/anime/${id}`);
        const data = await response.json();
        
        if (data && data.data) {
            currentAnime = data.data;
            renderAnimeDetails(currentAnime);
            spinner.classList.remove('active');
            container.style.display = 'flex';
        } else {
            throw new Error('Anime not found');
        }
    } catch (error) {
        console.error('Error fetching anime details:', error);
        alert('Failed to load anime details.');
        window.location.href = 'index.html';
    }
}

async function fetchEpisodes(id) {
    try {
        const response = await fetch(`${API_BASE}/anime/${id}/episodes`);
        const data = await response.json();
        
        if (data && data.data && data.data.length > 0) {
            renderEpisodes(data.data);
        }
    } catch (error) {
        console.error('Error fetching episodes:', error);
    }
}

async function fetchRelations(id) {
    try {
        const response = await fetch(`${API_BASE}/anime/${id}/relations`);
        const data = await response.json();
        
        if (data && data.data && data.data.length > 0) {
            const prequelsSequels = data.data.filter(r => r.relation === 'Sequel' || r.relation === 'Prequel' || r.relation === 'Alternative setting' || r.relation === 'Alternative version');
            if (prequelsSequels.length > 0) {
                renderRelations(prequelsSequels);
            }
        }
    } catch (error) {
        console.error('Error fetching relations:', error);
    }
}

function renderAnimeDetails(anime) {
    const title = anime.title_english || anime.title;
    
    document.title = `${title} | Watch on AnimePulse`;
    document.getElementById('anime-title').textContent = title;
    
    const imgUrl = anime.images.webp.large_image_url;
    document.getElementById('anime-image').src = imgUrl;
    
    const score = anime.score || 'N/A';
    const type = anime.type || 'TV';
    const status = anime.status;
    const episodes = anime.episodes || '?';
    
    document.getElementById('anime-meta').innerHTML = `
        <span class="meta-badge"><i class="fa-solid fa-star" style="color: gold;"></i> ${score}</span>
        <span class="meta-badge">${type}</span>
        <span class="meta-badge">${status}</span>
        <span class="meta-badge">${episodes} EPS</span>
    `;
    
    document.getElementById('anime-synopsis').textContent = anime.synopsis || "No synopsis available.";
    
    // Set up general Crunchyroll search link
    const searchTitle = encodeURIComponent(title);
    const externalUrl = `https://www.crunchyroll.com/search?q=${searchTitle}`;
    document.getElementById('watch-external-link').href = externalUrl;
}

function renderEpisodes(episodes) {
    const section = document.getElementById('episodes-section');
    const list = document.getElementById('episodes-list');
    list.innerHTML = '';
    
    section.style.display = 'block';
    
    const bookmarkedEpId = currentBookmark ? currentBookmark.bookmarked_episode : null;

    episodes.forEach(ep => {
        const wrapper = document.createElement('div');
        wrapper.className = 'ep-btn-wrapper';
        
        const btn = document.createElement('button');
        btn.className = `ep-btn ${bookmarkedEpId === ep.mal_id ? 'playing' : ''}`;
        btn.textContent = `EP ${ep.mal_id}`;
        
        if (bookmarkedEpId === ep.mal_id) {
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-bookmark bookmarked-ep';
            wrapper.appendChild(icon);
        }
        
        btn.addEventListener('click', () => {
            openPlatformModal(ep);
        });
        
        wrapper.appendChild(btn);
        list.appendChild(wrapper);
    });
}

function openPlatformModal(ep) {
    selectedEpisode = ep;
    const title = currentAnime.title_english || currentAnime.title;
    
    platformModalTitle.textContent = `Watch Episode ${ep.mal_id}`;
    
    // Bookmark this episode
    if (currentBookmark) {
        currentBookmark.bookmarked_episode = ep.mal_id;
        localStorage.setItem('animepulse_bookmarks', JSON.stringify(bookmarks));
        // Re-render to show bookmark icon
        fetchEpisodes(currentAnime.mal_id);
    } else {
        // Force set to plan to watch if no bookmark exists yet, then save episode
        statusSelect.value = "watching";
        statusSelect.dispatchEvent(new Event('change'));
        if (currentBookmark) {
            currentBookmark.bookmarked_episode = ep.mal_id;
            localStorage.setItem('animepulse_bookmarks', JSON.stringify(bookmarks));
            fetchEpisodes(currentAnime.mal_id);
        }
    }
    
    // Setup links
    const searchTitle = encodeURIComponent(title);
    const ytSearch = encodeURIComponent(`${title} Episode ${ep.mal_id}`);
    
    crunchyrollBtn.href = `https://www.crunchyroll.com/search?q=${searchTitle}`;
    youtubeBtn.href = `https://www.youtube.com/results?search_query=${ytSearch}`;
    
    platformModal.classList.add('active');
}

function renderRelations(relations) {
    const section = document.getElementById('relations-section');
    const list = document.getElementById('relations-list');
    list.innerHTML = '';
    
    let hasAnimeLinks = false;
    
    relations.forEach(rel => {
        // Find the anime entry if it exists
        const animeEntry = rel.entry.find(e => e.type === 'anime');
        if (animeEntry) {
            hasAnimeLinks = true;
            const link = document.createElement('a');
            link.className = 'relation-link';
            link.href = `watch.html?id=${animeEntry.mal_id}`;
            link.textContent = `${rel.relation}: ${animeEntry.name}`;
            list.appendChild(link);
        }
    });
    
    if (hasAnimeLinks) {
        section.style.display = 'block';
    }
}
