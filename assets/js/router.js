/**
 * Router - Simple SPA routing
 * Handles navigation and view loading
 */

class Router {
    constructor() {
        this.routes = {
            '/': () => this.loadHomeView(),
            '/browse': () => this.loadBrowseView(),
            '/category/:id': (params) => this.loadCategoryView(params),
            '/tag/:id': (params) => this.loadTagView(params)
        };
        
        this.currentView = null;
        
        // Initialize models
        this.trackModel = new TrackModel(supabaseClient);
        this.categoryModel = new CategoryModel(supabaseClient);
        this.tagModel = new TagModel(supabaseClient);
        
        this.init();
    }

    init() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Handle initial load
        this.handleRoute();
        
        // Intercept navigation clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.getAttribute('data-route') || link.getAttribute('href');
                this.navigate(route);
            }
        });
    }

    /**
     * Navigate to a route
     */
    navigate(path) {
        // Remove leading # if present
        path = path.replace(/^#/, '');
        window.location.hash = path;
    }

    /**
     * Handle route change
     */
    async handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        
        // Find matching route
        for (const [pattern, handler] of Object.entries(this.routes)) {
            const params = this.matchRoute(pattern, hash);
            if (params !== null) {
                await handler(params);
                this.updateActiveNav(hash);
                return;
            }
        }

        // 404 - default to home
        this.navigate('/');
    }

    /**
     * Match a route pattern against a path
     */
    matchRoute(pattern, path) {
        // Convert pattern to regex
        const paramNames = [];
        const regexPattern = pattern
            .replace(/\//g, '\\/')
            .replace(/:(\w+)/g, (_, name) => {
                paramNames.push(name);
                return '([^/]+)';
            });

        const regex = new RegExp(`^${regexPattern}$`);
        const match = path.match(regex);

        if (!match) return null;

        // Build params object
        const params = {};
        paramNames.forEach((name, i) => {
            params[name] = match[i + 1];
        });

        return params;
    }

    /**
     * Update active navigation link
     */
    updateActiveNav(path) {
        const navLinks = document.querySelectorAll('.site-nav a[data-route]');
        navLinks.forEach(link => {
            const route = link.getAttribute('data-route');
            if (route === path || (path.startsWith(route) && route !== '/')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Get flag emoji for language code
     */
    getLanguageFlag(langCode) {
        const flags = {
            'en': '🇬🇧',
            'sv': '🇸🇪',
            'de': '🇩🇪',
            'fr': '🇫🇷',
            'es': '🇪🇸',
            'it': '🇮🇹',
            'pt': '🇵🇹',
            'nl': '🇳🇱',
            'no': '🇳🇴',
            'da': '🇩🇰',
            'fi': '🇫🇮'
        };
        return flags[langCode] || '🌐';
    }

    /**
     * Show loading state
     */
    showLoading() {
        const content = document.getElementById('app-content');
        content.innerHTML = '<div class="loading">Loading...</div>';
    }

    /**
     * Load home view
     */
    async loadHomeView() {
        this.showLoading();
        
        const content = document.getElementById('app-content');
        content.innerHTML = await window.viewLoader.load('home');

        // Load popular tracks
        await this.loadPopularTracks();
    }

    /**
     * Load popular tracks for home page
     */
    async loadPopularTracks() {
        try {
            const tracks = await this.trackModel.getPopular(6);

            const container = document.getElementById('popularTracksContainer');
            
            if (!tracks || tracks.length === 0) {
                container.innerHTML = '<p class="no-results">No tracks available</p>';
                return;
            }

            // Render tracks
            container.innerHTML = tracks.map((track, index) => `
                <div class="track-card" data-track-index="${index}">
                    <div class="track-language-flag">${this.getLanguageFlag(track.language)}</div>
                    <button class="track-play-btn" title="Play ${track.title}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                    <div class="track-info">
                        <h3 class="track-title">${track.title}</h3>
                        ${track.description ? `<p class="track-description">${track.description}</p>` : ''}
                        <p class="track-meta">${this.getCategoryName(track)}</p>
                    </div>
                </div>
            `).join('');

            // Add click handlers
            this.attachTrackHandlers(tracks);

        } catch (error) {
            console.error('Error loading popular tracks:', error);
            document.getElementById('popularTracksContainer').innerHTML = 
                '<p class="error">Could not load tracks</p>';
        }
    }

    /**
     * Load browse view (categories and tags)
     */
    async loadBrowseView() {
        this.showLoading();
        
        const content = document.getElementById('app-content');
        content.innerHTML = await window.viewLoader.load('browse');

        // Load data (language filter removed for SPA)
        await Promise.all([
            this.loadCategories(),
            this.loadTags()
        ]);
    }

    /**
     * Load categories
     */
    async loadCategories() {
        try {
            const categories = await this.categoryModel.getAllWithTrackCounts();

            const container = document.getElementById('categoriesGrid');
            
            // Filter out categories with 0 tracks
            const categoriesWithTracks = categories.filter(cat => cat.trackCount > 0);
            
            if (!categoriesWithTracks || categoriesWithTracks.length === 0) {
                container.innerHTML = '<p class="no-results">No categories found</p>';
                return;
            }

            container.innerHTML = categoriesWithTracks.map(cat => `
                <a href="#/category/${cat.id}?name=${encodeURIComponent(cat.name)}" 
                   data-route="/category/${cat.id}" 
                   class="category-card">
                    <div class="category-image">
                        ${cat.image_url ? 
                            `<img src="${cat.image_url}" alt="${cat.name}">` : 
                            '<div class="category-placeholder">♪</div>'
                        }
                    </div>
                    <div class="category-info">
                        <h3>${cat.name}</h3>
                        <p>${cat.trackCount || 0} tracks</p>
                    </div>
                </a>
            `).join('');

        } catch (error) {
            console.error('Error loading categories:', error);
            document.getElementById('categoriesGrid').innerHTML = 
                '<p class="error">Could not load categories</p>';
        }
    }

    /**
     * Load tags
     */
    async loadTags() {
        try {
            const tags = await this.tagModel.getAllWithTrackCounts();
            
            const container = document.getElementById('tagsContainer');
            
            // Filter out tags with 0 tracks
            const tagsWithTracks = tags.filter(tag => tag.trackCount > 0);
            
            if (!tagsWithTracks || tagsWithTracks.length === 0) {
                container.innerHTML = '<p class="no-results">No tags found</p>';
                return;
            }

            container.innerHTML = tagsWithTracks.map(tag => `
                <a href="#/tag/${tag.id}?name=${encodeURIComponent(tag.name)}" 
                   data-route="/tag/${tag.id}" 
                   class="tag-badge" 
                   style="--tag-color: ${tag.color || '#666'}">
                    ${tag.name} (${tag.trackCount || 0})
                </a>
            `).join('');

        } catch (error) {
            console.error('Error loading tags:', error);
            document.getElementById('tagsContainer').innerHTML = 
                '<p class="error">Could not load tags</p>';
        }
    }

    /**
     * Load category view
     */
    async loadCategoryView(params) {
        this.showLoading();
        
        const categoryId = params.id;
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const categoryName = urlParams.get('name') || 'Category';

        const content = document.getElementById('app-content');
        content.innerHTML = await window.viewLoader.load('category');
        
        // Update category name
        document.getElementById('categoryName').textContent = categoryName;

        // Load tracks
        await this.loadCategoryTracks(categoryId);
    }

    /**
     * Load tracks for a category
     */
    async loadCategoryTracks(categoryId) {
        try {
            const tracks = await this.trackModel.getByCategoryAllLanguages(categoryId);

            const container = document.getElementById('tracksContainer');
            
            if (!tracks || tracks.length === 0) {
                container.innerHTML = '<p class="no-results">No tracks found</p>';
                return;
            }

            // Update category description if available
            const categoryData = tracks[0]?.categories;
            if (categoryData?.category_translations?.[0]?.body) {
                document.getElementById('categoryDescription').textContent = 
                    categoryData.category_translations[0].body;
            }

            // Render tracks
            container.innerHTML = tracks.map((track, index) => `
                <div class="track-card" data-track-index="${index}">
                    <div class="track-language-flag">${this.getLanguageFlag(track.language)}</div>
                    <button class="track-play-btn" title="Play ${track.title}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                    <div class="track-info">
                        <h3 class="track-title">${track.title}</h3>
                        ${track.description ? `<p class="track-description">${track.description}</p>` : ''}
                        ${track.track_tags?.length > 0 ? `
                            <div class="track-tags">
                                ${track.track_tags
                                    .filter(tt => tt && tt.tags)
                                    .map(tt => `<span class="tag-mini" style="background: ${tt.tags.color}">${tt.tags.name}</span>`)
                                    .join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');

            // Add handlers
            this.attachTrackHandlers(tracks);

        } catch (error) {
            console.error('Error loading tracks:', error);
            document.getElementById('tracksContainer').innerHTML = 
                '<p class="error">Could not load tracks</p>';
        }
    }

    /**
     * Load tag view (similar to category)
     */
    async loadTagView(params) {
        this.showLoading();
        
        const tagId = params.id;
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const tagName = urlParams.get('name') || 'Tag';

        const content = document.getElementById('app-content');
        content.innerHTML = await window.viewLoader.load('tag');
        
        // Update tag name
        document.getElementById('tagName').textContent = tagName;

        // Load tracks by tag
        await this.loadTagTracks(tagId);
    }

    /**
     * Load tracks for a tag
     */
    async loadTagTracks(tagId) {
        try {
            const tracks = await this.trackModel.getByTag(tagId);

            const container = document.getElementById('tracksContainer');
            
            if (tracks.length === 0) {
                container.innerHTML = '<p class="no-results">No tracks found</p>';
                return;
            }

            // Render tracks
            container.innerHTML = tracks.map((track, index) => `
                <div class="track-card" data-track-index="${index}">
                    <div class="track-language-flag">${this.getLanguageFlag(track.language)}</div>
                    <button class="track-play-btn" title="Play ${track.title}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                    <div class="track-info">
                        <h3 class="track-title">${track.title}</h3>
                        ${track.description ? `<p class="track-description">${track.description}</p>` : ''}
                        <p class="track-meta">${this.getCategoryName(track)}</p>
                    </div>
                </div>
            `).join('');

            // Add handlers
            this.attachTrackHandlers(tracks);

        } catch (error) {
            console.error('Error loading tracks:', error);
            document.getElementById('tracksContainer').innerHTML = 
                '<p class="error">Could not load tracks</p>';
        }
    }

    /**
     * Attach click handlers to track cards
     */
    attachTrackHandlers(tracks) {
        const trackCards = document.querySelectorAll('.track-card');
        trackCards.forEach(card => {
            const playBtn = card.querySelector('.track-play-btn');
            const index = parseInt(card.dataset.trackIndex);
            
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.audioPlayer.loadPlaylist(tracks, index, true);
            });
        });
    }

    /**
     * Get category name from track
     */
    getCategoryName(track) {
        const category = track.categories;
        if (category?.category_translations?.length > 0) {
            const translation = category.category_translations.find(t => t.locale === 'en') 
                || category.category_translations[0];
            return translation.name;
        }
        return 'Unknown';
    }
}

// Initialize router
window.router = new Router();
