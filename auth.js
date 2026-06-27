// auth.js
// Handles Google Sign-In and session management

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE'; // Replace with the actual Client ID

let currentUser = null;

// Initialize Google Identity Services
window.onload = function () {
    // We wait for the Google library to load via the async script
    if (window.google) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false
        });

        // Render the button in the placeholder
        const buttonContainer = document.getElementById('google-signin-button');
        if (buttonContainer) {
            google.accounts.id.renderButton(
                buttonContainer,
                { theme: "outline", size: "large", text: "signin_with", shape: "rectangular" }
            );
        }
    }

    checkExistingSession();
};

async function handleCredentialResponse(response) {
    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });
        
        if (!res.ok) throw new Error('Authentication failed');
        
        const data = await res.json();
        
        // Save token and user info
        localStorage.setItem('session_token', data.token);
        localStorage.setItem('user_info', JSON.stringify(data.user));
        
        currentUser = data.user;
        updateUIForUser();
        
        // Sync bookmarks from database
        await syncBookmarksFromDatabase();
        
    } catch (error) {
        console.error("Login error:", error);
        alert("Failed to sign in. Please try again.");
    }
}

function checkExistingSession() {
    const token = localStorage.getItem('session_token');
    const userInfo = localStorage.getItem('user_info');
    
    if (token && userInfo) {
        currentUser = JSON.parse(userInfo);
        updateUIForUser();
    }
}

function updateUIForUser() {
    const loginContainer = document.getElementById('auth-container');
    if (!loginContainer) return;
    
    if (currentUser) {
        loginContainer.innerHTML = `
            <div class="user-profile" style="display: flex; align-items: center; gap: 10px;">
                <img src="${currentUser.picture}" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%;">
                <span style="font-family: 'Outfit', sans-serif; font-weight: 500;">${currentUser.name.split(' ')[0]}</span>
                <button onclick="signOut()" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;">Sign Out</button>
            </div>
        `;
    } else {
        loginContainer.innerHTML = `<div id="google-signin-button"></div>`;
        if (window.google) {
            google.accounts.id.renderButton(
                document.getElementById('google-signin-button'),
                { theme: "outline", size: "large" }
            );
        }
    }
}

function signOut() {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user_info');
    currentUser = null;
    
    updateUIForUser();
    if (window.google) {
        google.accounts.id.disableAutoSelect();
    }
    window.location.reload();
}

async function syncBookmarksFromDatabase() {
    const token = localStorage.getItem('session_token');
    if (!token) return;

    try {
        const res = await fetch('/api/bookmarks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            
            let localBookmarks = JSON.parse(localStorage.getItem('animepulse_bookmarks')) || [];
            
            data.bookmarks.forEach(b => {
                const index = localBookmarks.findIndex(lb => lb.mal_id.toString() === b.anime_id.toString());
                if (index > -1) {
                    localBookmarks[index].watch_status = b.status;
                } else {
                    // Create stub if missing
                    localBookmarks.push({
                        mal_id: parseInt(b.anime_id),
                        title: "Bookmarked Anime", 
                        images: { webp: { large_image_url: "" } },
                        watch_status: b.status
                    });
                }
            });
            
            localStorage.setItem('animepulse_bookmarks', JSON.stringify(localBookmarks));
            window.dispatchEvent(new Event('bookmarksUpdated'));
        }
    } catch (error) {
        console.error("Failed to sync bookmarks:", error);
    }
}

// Global function to sync a single bookmark change to the DB
window.saveBookmarkToDatabase = async function(animeId, status) {
    const token = localStorage.getItem('session_token');
    if (!token) return;

    try {
        await fetch('/api/bookmarks', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ anime_id: animeId.toString(), status: status || '' })
        });
    } catch (error) {
        console.error("Failed to save bookmark to database:", error);
    }
};

window.addEventListener('bookmarksUpdated', () => {
    // Optional: add a hook for the main script to listen to if it wants to reload
    if (typeof loadBookmarks === 'function' && typeof currentActiveTab !== 'undefined' && currentActiveTab === 'bookmarks') {
        loadBookmarks();
    }
});
