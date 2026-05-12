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
        
        let query = supabaseClient
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
            .eq('is_private', false); // Filter out private tracks
        
        // Only filter by language if not "all"
        if (currentLang !== 'all') {
            query = query.eq('language', currentLang);
        }
        
        // Fetch category details and tracks
        const { data: tracks, error } = await query.order('created_at', { ascending: false });

        // console.log ('Fetched tracks for category:', tracks);

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
            imageContainer.classList.add('show');
        }

        // Display tracks
        categoryTrackTitles = tracks.map(track => track.title || '');
        displayTracks(tracks);
        
        // Update language filter to show only available languages in this category
        updateLanguageFilterForCategory();
    } catch (err) {
        console.error('Error:', err);
        document.getElementById('tracksContainer').innerHTML = 
            '<p class="error">An error occurred. Please try again later.</p>';
    }
}

// Update language filter based on tracks in this category
async function updateLanguageFilterForCategory() {
    try {
        // Get all tracks in this category (without language filter but excluding private tracks)
        const { data: allTracks, error } = await supabaseClient
            .from('tracks')
            .select('language')
            .eq('category_id', categoryId)
            .eq('is_private', false); // Exclude private tracks

        if (error) {
            console.error('Error fetching languages for category:', error);
            return;
        }

        // Get unique languages in this category
        const availableLanguages = [...new Set(allTracks.map(t => t.language))].filter(Boolean);
        console.log('Available languages in category:', availableLanguages);

        // Update the language selector to only show these languages
        if (window.languageFilter && window.languageFilter.updateAvailableLanguages) {
            window.languageFilter.updateAvailableLanguages(availableLanguages);
        }
    } catch (err) {
        console.error('Error updating language filter:', err);
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
                <div style="display: flex; align-items: center; gap: 8px; justify-content: flex-end; margin-bottom: 12px; min-height: 28px;">
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
                    ${track.spotify_id ? `
                        <a href="https://open.spotify.com/track/${track.spotify_id}" target="_blank" class="action-button spotify-button">
                            <img src="assets/images/icons/spotify.svg" alt="Spotify" width="16" height="16">
                            Spotify
                        </a>
                    ` : ''}
                    ${isAuthenticated ? `
                        <a href="admin/edit.html?id=${track.id}" class="action-button edit-button">
                            <img src="assets/images/icons/edit.svg" alt="Edit" width="14" height="14">
                            Edit
                        </a>
                    ` : ''}
                </div>
                <h3 class="track-title">${track.title}</h3>
                ${track.description ? `<p class="track-description">${track.description}</p>` : ''}
                <div class="track-actions">
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
        nowPlayingLabel.classList.add('hide');
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
            nowPlayingLabel.classList.add('hide');
            return;
        }
        nowPlayingLabel.classList.remove('hide');
        nowPlayingLabel.textContent = `Now playing: ${categoryTrackTitles[index]}`;
    }

    function hideNowPlaying() {
        nowPlayingLabel.classList.add('hide');
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