// Get category ID from URL
const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get('id');
const categoryName = urlParams.get('name');

// Check if user is authenticated
let isAuthenticated = false;

async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    isAuthenticated = !!session;
    // console.log('Auth status:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
}

if (!categoryId) {
    document.getElementById('categoryName').textContent = 'Category missing';
    document.getElementById('tracksContainer').innerHTML = '<p class="error">No category selected. <a href="browse.html">Go back</a></p>';
} else {
    // Check auth then load tracks
    checkAuth().then(() => {
        // Set category name if provided
        if (categoryName) {
            document.getElementById('categoryName').textContent = categoryName;
        }

        // Load tracks for this category
        loadCategoryTracks();
    });
}

async function loadCategoryTracks() {
    try {
        const currentLang = window.languageFilter.getCurrentLanguage();
        
        // Fetch category details and tracks
        const { data: tracks, error } = await supabaseClient
            .from('tracks')
            .select(`
                *,
                categories:category_id(
                    id,
                    image_url,
                    category_translations(
                        name,
                        body,
                        slug,
                        locale
                    )
                ),
                track_tags(
                    tags(id, name, color)
                )
            `)
            .eq('category_id', categoryId)
            .eq('language', currentLang)
            .order('created_at', { ascending: false });

        console.log ('Fetched tracks for category:', tracks);

        if (error) {
            console.error('Error loading tracks:', error);
            document.getElementById('tracksContainer').innerHTML = 
                '<p class="error">Could not load tracks. Please try again later.</p>';
            return;
        }

        if (!tracks || tracks.length === 0) {
            document.getElementById('tracksContainer').innerHTML = 
                '<p class="no-results">No tracks found in this category.</p>';
            return;
        }

        // Flatten category translation data
        const categoryData = tracks[0].categories;
        
        // Find the translation for current language
        const categoryTranslation = categoryData?.category_translations?.find(
            t => t.locale === currentLang
        ) || categoryData?.category_translations?.[0];

        // Update category name from first track if not in URL
        if (!categoryName && categoryTranslation) {
            document.getElementById('categoryName').textContent = categoryTranslation.name;
        }

        // Show category description if exists
        if (categoryTranslation?.body) {
            document.getElementById('categoryDescription').textContent = categoryTranslation.body;
        }
        
        // Show category image if exists
        if (categoryData?.image_url) {
            const imageContainer = document.getElementById('categoryImageContainer');
            const imageElement = document.getElementById('categoryImage');
            imageElement.src = categoryData.image_url;
            imageElement.alt = categoryTranslation?.name || 'Category';
            imageContainer.style.display = 'block';
        }

        // Display tracks
        categoryTrackTitles = tracks.map(track => track.title || '');
        displayTracks(tracks);
    } catch (err) {
        console.error('Error:', err);
        document.getElementById('tracksContainer').innerHTML = 
            '<p class="error">An error occurred. Please try again later.</p>';
    }
}

const playAllButton = document.getElementById('playAllBtn');
const prevTrackButton = document.getElementById('prevTrackBtn');
const nextTrackButton = document.getElementById('nextTrackBtn');
const nowPlayingLabel = document.getElementById('nowPlayingLabel');
let playAllActive = false;
let categoryTrackTitles = [];

function displayTracks(tracks) {
    const container = document.getElementById('tracksContainer');
    
    const html = tracks.map(track => {
        // Extract tags
        const tags = track.track_tags?.map(tt => tt.tags).filter(Boolean) || [];
        
        // Build tags HTML

        return `
            <div class="track-card">
                <div class="track-header">
                    <h3 class="track-title">${track.title}</h3>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${tags.length > 0 ? `
                            <div class="track-header-tags">
                                ${tags.map(tag => `
                                    <a href="tag.html?id=${tag.id}&name=${encodeURIComponent(tag.name)}" 
                                        class="tag-badge-small" 
                                        style="background-color: ${tag.color}20; color: ${tag.color}; border-color: ${tag.color}40">
                                        ${tag.name}
                                    </a>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${isAuthenticated ? `
                            <a href="admin/edit.html?id=${track.id}" class="button secondary small" style="margin-left: auto;">
                                <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Edit
                            </a>
                        ` : ''}
                    </div>
                </div>
                ${track.description ? `<p class="track-description">${track.description}</p>` : ''}
                <div class="track-actions">
                    ${track.spotify_url ? `
                        <a href="${track.spotify_url}" target="_blank" class="button secondary">
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                            Spotify
                        </a>
                    ` : ''}
                    ${track.mp3_url ? `
                        <audio controls class="track-player">
                            <source src="${track.mp3_url}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
    setupPlayAllButton();
}

function setupPlayAllButton() {
    const audioPlayers = Array.from(document.querySelectorAll('#tracksContainer .track-player'));

    if (!playAllButton || !prevTrackButton || !nextTrackButton || !nowPlayingLabel) return;
    if (audioPlayers.length === 0) {
        playAllButton.disabled = true;
        prevTrackButton.disabled = true;
        nextTrackButton.disabled = true;
        playAllButton.textContent = 'Play All';
        nowPlayingLabel.style.display = 'none';
        playAllActive = false;
        return;
    }

    let currentIndex = 0;
    playAllButton.disabled = false;
    prevTrackButton.disabled = true;
    nextTrackButton.disabled = audioPlayers.length <= 1;
    playAllButton.textContent = 'Play All';
    playAllActive = false;

    function updateButtonState() {
        prevTrackButton.disabled = currentIndex <= 0;
        nextTrackButton.disabled = currentIndex >= audioPlayers.length - 1;
    }

    function showNowPlaying(index) {
        if (typeof index !== 'number' || index < 0 || index >= categoryTrackTitles.length) {
            nowPlayingLabel.style.display = 'none';
            return;
        }
        nowPlayingLabel.style.display = 'block';
        nowPlayingLabel.textContent = `Now playing: ${categoryTrackTitles[index]}`;
    }

    function hideNowPlaying() {
        nowPlayingLabel.style.display = 'none';
    }

    function stopAllAudio(excludeIndex = -1) {
        audioPlayers.forEach((player, index) => {
            if (index !== excludeIndex) {
                player.pause();
                player.currentTime = 0;
            }
        });
    }

    function isAnyAudioPlaying() {
        return audioPlayers.some(player => !player.paused && player.currentTime > 0 && !player.ended);
    }

    function stopPlayAll() {
        playAllActive = false;
        playAllButton.textContent = 'Play All';
        stopAllAudio();
        updateButtonState();
        hideNowPlaying();
    }

    async function playTrack(index, asPlayAll = false) {
        if (index < 0 || index >= audioPlayers.length) return;

        stopAllAudio(index);
        currentIndex = index;
        updateButtonState();
        showNowPlaying(currentIndex);
        playAllButton.textContent = 'Pause';
        playAllActive = asPlayAll;

        try {
            await audioPlayers[currentIndex].play();
        } catch (error) {
            console.warn('Unable to play track:', error);
            if (!asPlayAll) {
                hideNowPlaying();
            }
            playAllActive = false;
        }
    }

    audioPlayers.forEach((player, index) => {
        player.addEventListener('play', () => {
            if (playAllActive && index !== currentIndex) return;
            stopAllAudio(index);
            currentIndex = index;
            updateButtonState();
            showNowPlaying(index);
            playAllButton.textContent = playAllActive ? 'Pause' : 'Play All';
        });

        player.addEventListener('pause', () => {
            setTimeout(() => {
                if (!isAnyAudioPlaying()) {
                    hideNowPlaying();
                    playAllActive = false;
                    playAllButton.textContent = 'Play All';
                }
            }, 50);
        });

        player.onended = () => {
            if (playAllActive) {
                if (index + 1 < audioPlayers.length) {
                    playTrack(index + 1, true);
                } else {
                    stopPlayAll();
                }
            } else {
                if (!isAnyAudioPlaying()) {
                    hideNowPlaying();
                }
            }
        };
    });

    playAllButton.onclick = async () => {
        if (playAllActive) {
            stopPlayAll();
            return;
        }
        await playTrack(currentIndex, true);
    };

    prevTrackButton.onclick = async () => {
        if (currentIndex <= 0) return;
        await playTrack(currentIndex - 1, false);
    };

    nextTrackButton.onclick = async () => {
        if (currentIndex >= audioPlayers.length - 1) return;
        await playTrack(currentIndex + 1, false);
    };
}