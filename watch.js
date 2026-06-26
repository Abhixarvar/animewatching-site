const API_BASE = 'https://api.jikan.moe/v4';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');

    if (animeId) {
        fetchAnimeDetails(animeId);
    } else {
        window.location.href = 'index.html';
    }
});

async function fetchAnimeDetails(id) {
    const spinner = document.getElementById('loading-spinner');
    const container = document.getElementById('watch-container');
    
    try {
        const response = await fetch(`${API_BASE}/anime/${id}`);
        const data = await response.json();
        
        if (data && data.data) {
            renderAnimeDetails(data.data);
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
    
    // Set up AnimeDao search link
    const searchTitle = encodeURIComponent(title);
    const animedaoUrl = `https://animedao.watch/search/?search=${searchTitle}`;
    document.getElementById('animedao-link').href = animedaoUrl;
}
