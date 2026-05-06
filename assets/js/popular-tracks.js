// Load and display popular tracks on the homepage
let isAuthenticated = false;
let trackModel;

async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    isAuthenticated = !!session;
}

async function loadPopularTracks() {
    try {
        // Use TrackModel to fetch popular tracks
        const tracks = await trackModel.getPopular(3);

        if (!tracks || tracks.length === 0) {
            document.getElementById('popularTracksContainer').innerHTML = 
                '<p class="no-results">No tracks found.</p>';
            return;
        }

        displayPopularTracks(tracks);
    } catch (err) {
        console.error('Error:', err);
        document.getElementById('popularTracksContainer').innerHTML = 
            '<p class="error">An error occurred. Please try again later.</p>';
    }
}

function displayPopularTracks(tracks) {
    const container = document.getElementById('popularTracksContainer');
    
    const html = tracks.map(track => {
        return `
            <article class="preview-card">
                <h3>${track.title}</h3>
                ${track.description ? `<p>${track.description}</p>` : ''}
                ${track.mp3_url ? `
                    <audio controls>
                        <source src="${track.mp3_url}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                ` : ''}
            </article>
        `;
    }).join('');

    container.innerHTML = html;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize TrackModel
    trackModel = new TrackModel(supabaseClient);
    
    await checkAuth();
    await loadPopularTracks();
});
