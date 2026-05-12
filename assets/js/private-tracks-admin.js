/**
 * Private Tracks Admin Page
 * Shows all private tracks with links, QR codes, and edit options
 */

let trackModel;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = '../login.html';
        return;
    }

    // Initialize model
    trackModel = new TrackModel(supabaseClient);
    
    // Load private tracks
    await loadPrivateTracks();
});

/**
 * Load all private tracks from database
 */
async function loadPrivateTracks() {
    try {
        const { data: tracks, error } = await supabaseClient
            .from('tracks')
            .select(`
                *,
                categories:category_id(
                    id,
                    category_translations(name, locale)
                )
            `)
            .eq('is_private', true)
            .not('private_token', 'is', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading private tracks:', error);
            showError('Could not load private tracks: ' + error.message);
            return;
        }

        document.getElementById('loadingMessage').style.display = 'none';

        if (!tracks || tracks.length === 0) {
            document.getElementById('noTracksMessage').style.display = 'block';
            return;
        }

        displayPrivateTracks(tracks);
    } catch (err) {
        console.error('Error:', err);
        showError('An error occurred: ' + err.message);
    }
}

/**
 * Display private tracks in grid
 */
function displayPrivateTracks(tracks) {
    const container = document.getElementById('privateTracksContainer');
    
    const html = tracks.map(track => {
        const privateUrl = trackModel.getPrivateTrackUrl(track.private_token);
        const categoryName = track.categories?.category_translations?.[0]?.name || 'Unknown';
        const qrId = `qr-${track.id}`;
        
        return `
            <div class="private-track-card">
                <div class="private-track-header">
                    <div>
                        <h3 class="private-track-title">${track.title}</h3>
                        <p class="private-track-meta">
                            <span class="category-badge">${categoryName}</span>
                            <span class="language-badge">${track.language.toUpperCase()}</span>
                        </p>
                    </div>
                    <div class="private-track-actions">
                        <a href="edit.html?id=${track.id}" class="action-button edit-button" title="Edit track">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit
                        </a>
                    </div>
                </div>

                ${track.description ? `<p class="private-track-description">${track.description}</p>` : ''}

                <div class="private-track-qr">
                    <div id="${qrId}" class="qr-code"></div>
                </div>

                <div class="private-track-link">
                    <input 
                        type="text" 
                        value="${privateUrl}" 
                        readonly 
                        class="private-link-input" 
                        id="link-${track.id}"
                    />
                    <button 
                        class="action-button primary" 
                        onclick="copyLink('${track.id}')"
                        id="copy-btn-${track.id}"
                    >
                        Copy Link
                    </button>
                    <button 
                        class="action-button secondary" 
                        onclick="openLink('${privateUrl}')"
                    >
                        Open
                    </button>
                </div>

                ${track.mp3_url ? `
                    <audio controls class="track-player">
                        <source src="${track.mp3_url}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                ` : ''}
            </div>
        `;
    }).join('');

    container.innerHTML = html;
    container.style.display = 'grid';

    // Generate QR codes
    tracks.forEach(track => {
        const privateUrl = trackModel.getPrivateTrackUrl(track.private_token);
        const qrId = `qr-${track.id}`;
        
        new QRCode(document.getElementById(qrId), {
            text: privateUrl,
            width: 128,
            height: 128,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    });
}

/**
 * Copy link to clipboard
 */
async function copyLink(trackId) {
    const input = document.getElementById(`link-${trackId}`);
    const button = document.getElementById(`copy-btn-${trackId}`);
    
    try {
        await navigator.clipboard.writeText(input.value);
        
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        button.style.background = '#10b981';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    } catch (err) {
        // Fallback for older browsers
        input.select();
        document.execCommand('copy');
    }
}

/**
 * Open private link in new tab
 */
function openLink(url) {
    window.open(url, '_blank');
}

/**
 * Show error message
 */
function showError(message) {
    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorMessage').style.display = 'block';
}

// Make functions global for onclick handlers
window.copyLink = copyLink;
window.openLink = openLink;
