/**
 * Audio Player - Persistent music player
 * Handles playback, playlist management, and playback modes
 */

class AudioPlayer {
    constructor() {
        this.audio = new Audio();
        this.currentTrack = null;
        this.playlist = [];
        this.currentIndex = -1;
        this.mode = 'sequential'; // 'sequential', 'repeat', 'shuffle'
        this.continuePlayback = true; // New: whether to continue to next track
        this.volume = 0.8;
        
        // Initialize model
        this.trackModel = new TrackModel(supabaseClient);
        
        this.elements = {
            artwork: document.getElementById('playerArtwork'),
            title: document.getElementById('playerTitle'),
            category: document.getElementById('playerCategory'),
            playBtn: document.getElementById('playerPlay'),
            prevBtn: document.getElementById('playerPrev'),
            nextBtn: document.getElementById('playerNext'),
            continueBtn: document.getElementById('playerContinue'),
            shuffleBtn: document.getElementById('playerShuffle'),
            repeatBtn: document.getElementById('playerRepeat'),
            volumeBtn: document.getElementById('playerVolume'),
            volumeSlider: document.getElementById('playerVolumeSlider'),
            seekBar: document.getElementById('playerSeek'),
            progressFill: document.getElementById('progressFill'),
            currentTime: document.getElementById('playerCurrentTime'),
            duration: document.getElementById('playerDuration')
        };
        
        this.init();
    }

    init() {
        // Set initial volume
        this.audio.volume = this.volume;
        this.elements.volumeSlider.value = this.volume * 100;

        // Setup audio event listeners
        this.audio.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.audio.addEventListener('ended', () => this.onEnded());
        this.audio.addEventListener('play', () => this.onPlayStateChange(true));
        this.audio.addEventListener('pause', () => this.onPlayStateChange(false));
        this.audio.addEventListener('error', (e) => this.onError(e));

        // Setup control listeners
        this.elements.playBtn.addEventListener('click', () => this.togglePlay());
        this.elements.prevBtn.addEventListener('click', () => this.playPrevious());
        this.elements.nextBtn.addEventListener('click', () => this.playNext());
        this.elements.continueBtn.addEventListener('click', () => this.toggleContinue());
        this.elements.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.elements.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        this.elements.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        this.elements.seekBar.addEventListener('input', (e) => this.seek(e.target.value));

        // Load a random suggested track
        this.loadSuggestedTrack();
    }

    /**
     * Load a random public track as suggestion
     */
    async loadSuggestedTrack() {
        try {
            const randomTrack = await this.trackModel.getRandomPublic();

            if (randomTrack) {
                // Set as current track but don't play
                this.currentTrack = randomTrack;
                this.playlist = [randomTrack];
                this.currentIndex = 0;
                
                this.updateUI();
                this.elements.playBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error loading suggested track:', error);
        }
    }

    /**
     * Load a playlist and optionally start playing
     * @param {Array} tracks - Array of track objects
     * @param {number} startIndex - Index to start playing from
     * @param {boolean} autoPlay - Whether to start playing immediately
     */
    loadPlaylist(tracks, startIndex = 0, autoPlay = true) {
        if (!tracks || tracks.length === 0) {
            console.warn('No tracks to load');
            return;
        }

        this.playlist = tracks;
        this.currentIndex = startIndex;
        
        if (autoPlay) {
            this.play(this.playlist[startIndex]);
        } else {
            this.currentTrack = this.playlist[startIndex];
            this.updateUI();
        }

        this.updateButtonStates();
    }

    /**
     * Play a specific track
     * @param {Object} track - Track object to play
     */
    play(track) {
        if (!track || !track.mp3_url) {
            console.error('Invalid track - missing mp3_url', track);
            return;
        }

        this.currentTrack = track;
        this.audio.src = track.mp3_url;
        this.audio.play().catch(err => {
            console.error('Play error:', err);
        });
        
        this.updateUI();
        this.updateButtonStates();
    }

    /**
     * Toggle play/pause
     */
    togglePlay() {
        if (!this.currentTrack) {
            return;
        }

        if (this.audio.paused) {
            this.audio.play();
        } else {
            this.audio.pause();
        }
    }

    /**
     * Play next track in playlist
     */
    playNext() {
        if (this.playlist.length === 0) return;

        if (this.mode === 'shuffle') {
            // Random track
            const randomIndex = Math.floor(Math.random() * this.playlist.length);
            this.currentIndex = randomIndex;
        } else {
            // Sequential or repeat
            this.currentIndex++;
            if (this.currentIndex >= this.playlist.length) {
                if (this.mode === 'repeat') {
                    this.currentIndex = 0;
                } else {
                    // End of playlist - stop if continue is off
                    if (!this.continuePlayback) {
                        this.audio.pause();
                        return;
                    }
                    this.currentIndex = 0;
                }
            }
        }

        this.play(this.playlist[this.currentIndex]);
    }

    /**
     * Play previous track in playlist
     */
    playPrevious() {
        if (this.playlist.length === 0) return;

        // If more than 3 seconds played, restart current track
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
            return;
        }

        this.currentIndex--;
        if (this.currentIndex < 0) {
            if (this.mode === 'repeat') {
                this.currentIndex = this.playlist.length - 1;
            } else {
                this.currentIndex = 0;
                return;
            }
        }

        this.play(this.playlist[this.currentIndex]);
    }

    /**
     * Toggle shuffle mode
     */
    toggleShuffle() {
        if (this.mode === 'shuffle') {
            this.mode = 'sequential';
            this.elements.shuffleBtn.classList.remove('active');
        } else {
            this.mode = 'shuffle';
            this.elements.shuffleBtn.classList.add('active');
            // Turn off repeat when shuffle is on
            this.elements.repeatBtn.classList.remove('active');
        }
    }

    /**
     * Toggle repeat mode
     */
    toggleRepeat() {
        if (this.mode === 'repeat') {
            this.mode = 'sequential';
            this.elements.repeatBtn.classList.remove('active');
            this.elements.repeatBtn.title = 'Repeat off';
        } else {
            this.mode = 'repeat';
            this.elements.repeatBtn.classList.add('active');
            this.elements.repeatBtn.title = 'Repeat on';
            // Turn off shuffle when repeat is on
            this.elements.shuffleBtn.classList.remove('active');
        }
    }

    /**
     * Toggle continue playback
     */
    toggleContinue() {
        this.continuePlayback = !this.continuePlayback;
        
        if (this.continuePlayback) {
            this.elements.continueBtn.classList.add('active');
            this.elements.continueBtn.title = 'Continue to next track: On';
        } else {
            this.elements.continueBtn.classList.remove('active');
            this.elements.continueBtn.title = 'Continue to next track: Off';
        }
    }

    /**
     * Set volume
     * @param {number} value - Volume value between 0 and 1
     */
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        this.audio.volume = this.volume;
    }

    /**
     * Seek to position
     * @param {number} value - Seek position (0-100)
     */
    seek(value) {
        if (!this.audio.duration) return;
        const time = (value / 100) * this.audio.duration;
        this.audio.currentTime = time;
    }

    /**
     * Update UI with current track info
     */
    updateUI() {
        if (!this.currentTrack) return;

        // Update title and category
        this.elements.title.textContent = this.currentTrack.title || 'Unknown Track';
        
        // Get category name from translations
        const category = this.currentTrack.categories;
        let categoryName = 'Unknown Category';
        
        if (category?.category_translations?.length > 0) {
            const translation = category.category_translations.find(t => t.locale === 'en') 
                || category.category_translations[0];
            categoryName = translation.name;
        }
        
        this.elements.category.textContent = categoryName;

        // Update artwork - not available at track level
        // Cover art is at album level, so we hide it for now
        this.elements.artwork.classList.remove('loaded');
        this.elements.artwork.src = '';
    }

    /**
     * Update button enabled/disabled states
     */
    updateButtonStates() {
        const hasPlaylist = this.playlist.length > 0;
        const hasMultipleTracks = this.playlist.length > 1;

        this.elements.playBtn.disabled = !this.currentTrack;
        this.elements.prevBtn.disabled = !hasMultipleTracks;
        this.elements.nextBtn.disabled = !hasMultipleTracks;
    }

    /**
     * Format time in MM:SS
     */
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Event handlers
    onLoadedMetadata() {
        this.elements.duration.textContent = this.formatTime(this.audio.duration);
    }

    onTimeUpdate() {
        const current = this.audio.currentTime;
        const duration = this.audio.duration;

        if (duration) {
            const percent = (current / duration) * 100;
            this.elements.progressFill.style.width = `${percent}%`;
            this.elements.seekBar.value = percent;
        }

        this.elements.currentTime.textContent = this.formatTime(current);
    }

    onEnded() {
        // Only continue to next track if continuePlayback is enabled
        if (this.continuePlayback) {
            this.playNext();
        } else {
            // Stop playback and update UI
            this.audio.pause();
            this.onPlayStateChange(false);
        }
    }

    onPlayStateChange(isPlaying) {
        if (isPlaying) {
            this.elements.playBtn.classList.add('playing');
        } else {
            this.elements.playBtn.classList.remove('playing');
        }
    }

    onError(e) {
        console.error('Audio playback error:', e);
        this.elements.title.textContent = 'Playback error';
        this.elements.category.textContent = 'Could not load audio';
    }
}

// Initialize global player instance
window.audioPlayer = new AudioPlayer();
