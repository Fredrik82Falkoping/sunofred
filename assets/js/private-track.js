// Load and display a private track
let isAuthenticated = false;

async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    isAuthenticated = !!session;
}

async function loadPrivateTrack() {
    // Check authentication first
    await checkAuth();

    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // console.log('Token from URL:', token);

    if (!token) {
        console.error('No token found in URL');
        showError();
        return;
    }

    try {
        // console.log('Fetching track from database...');
        
        // Fetch track by private_token
        const { data: track, error } = await supabaseClient
            .from('tracks')
            .select(`
                *,
                categories:category_id(
                    id,
                    image_url,
                    category_translations(name, locale)
                ),
                track_tags(
                    tags(id, name, color)
                )
            `)
            .eq('private_token', token)
            .eq('is_private', true)
            .single();

        // console.log('Database response:', { track, error });

        if (error || !track) {
            console.error('Error loading private track:', error);
            showError();
            return;
        }

        // console.log('Track loaded successfully:', track);
        displayTrack(track, token);
    } catch (err) {
        console.error('Error:', err);
        showError();
    }
}

function displayTrack(track, token) {
    // Hide loading, show content
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('trackContent').style.display = 'block';

    // Set track info
    document.getElementById('trackTitle').textContent = track.title;
    
    if (track.description) {
        document.getElementById('trackDescription').textContent = track.description;
    } else {
        document.getElementById('trackDescription').style.display = 'none';
    }

    // Set audio source
    if (track.mp3_url) {
        document.getElementById('trackSource').src = track.mp3_url;
        document.getElementById('trackPlayer').load();
    } else {
        document.getElementById('trackPlayer').style.display = 'none';
    }

    // Display tags if any
    if (track.track_tags && track.track_tags.length > 0) {
        const tags = track.track_tags.map(tt => tt.tags).filter(Boolean);
        if (tags.length > 0) {
            const tagsHtml = tags.map(tag => `
                <span class="tag-badge" style="background-color: ${tag.color}20; color: ${tag.color}; border: 1px solid ${tag.color}40;">
                    ${tag.name}
                </span>
            `).join('');
            document.getElementById('tagsContainer').innerHTML = tagsHtml;
        }
    }

    // Display action buttons (Spotify and Edit)
    const actionsHtml = [];
    
    if (track.spotify_id) {
        actionsHtml.push(`
            <a href="https://open.spotify.com/track/${track.spotify_id}" target="_blank" class="action-button spotify-button">
                <img src="assets/images/icons/spotify.svg" alt="Spotify" width="18" height="18">
                Listen on Spotify
            </a>
        `);
    }
    
    if (isAuthenticated) {
        actionsHtml.push(`
            <a href="admin/edit.html?id=${track.id}" class="action-button edit-button">
                <img src="assets/images/icons/edit.svg" alt="Edit" width="16" height="16">
                Edit
            </a>
        `);
    }
    
    if (actionsHtml.length > 0) {
        document.getElementById('spotifyLinkContainer').innerHTML = `
            <div class="track-actions-buttons">
                ${actionsHtml.join('')}
            </div>
        `;
    }

    // Generate share link
    // Get the full current URL without query parameters
    const currentUrl = window.location.href.split('?')[0];
    const shareUrl = `${currentUrl}?token=${token}`;
    console.log('Generated share URL:', shareUrl);
    
    const shareLinkInput = document.getElementById('shareLink');
    if (shareLinkInput) {
        shareLinkInput.value = shareUrl;
        console.log('Share link value set to:', shareLinkInput.value);
    } else {
        console.error('Share link input element not found!');
    }

    // Generate QR code
    new QRCode(document.getElementById('qrcode'), {
        text: shareUrl,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });

    // Copy button functionality
    const copyButton = document.getElementById('copyButton');
    copyButton.addEventListener('click', async () => {
        const shareLink = document.getElementById('shareLink');
        try {
            await navigator.clipboard.writeText(shareLink.value);
            copyButton.textContent = '✓ Copied!';
            copyButton.classList.add('copied');
            setTimeout(() => {
                copyButton.textContent = 'Copy Link';
                copyButton.classList.remove('copied');
            }, 2000);
        } catch (err) {
            // Fallback for older browsers
            shareLink.select();
            document.execCommand('copy');
            copyButton.textContent = '✓ Copied!';
        }
    });
}

function showError() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', loadPrivateTrack);
