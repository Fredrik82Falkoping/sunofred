/**
 * Track Model - Data layer for tracks
 * Handles all database operations for tracks
 */

class TrackModel {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Get current language from language filter or default to 'en'
     */
    getCurrentLanguage() {
        return window.languageFilter?.getCurrentLanguage() || 'en';
    }

    /**
     * Fetch tracks for a specific category
     * @param {string} categoryId - Category ID
     * @param {string} locale - Optional locale override
     * @returns {Promise<Array>} Array of tracks with category and tag data
     */
    async getByCategory(categoryId, locale = null) {
        const currentLang = locale || this.getCurrentLanguage();
        
        const { data, error } = await this.supabase
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
            .eq('is_private', false) // Exclude private tracks
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tracks:', error);
            throw error;
        }

        return (data || []).map(track => this._flattenTrack(track, currentLang));
    }

    /**
     * Get a single track by ID
     * @param {string} trackId - Track ID
     * @returns {Promise<Object>} Track with category and tag data
     */
    async getById(trackId) {
        const currentLang = this.getCurrentLanguage();
        
        const { data, error } = await this.supabase
            .from('tracks')
            .select(`
                *,
                categories:category_id(
                    id,
                    image_url,
                    category_translations!inner(name, locale)
                ),
                track_tags(tags(id, name, color))
            `)
            .eq('id', trackId)
            .single();

        if (error) {
            console.error('Error fetching track:', error);
            throw error;
        }

        return this._flattenTrack(data);
    }

    /**
     * Get a track by its private token
     * @param {string} token - Private token
     * @returns {Promise<Object>} Track with category and tag data
     */
    async getByPrivateToken(token) {
        const { data, error } = await this.supabase
            .from('tracks')
            .select(`
                *,
                categories:category_id(
                    id,
                    image_url,
                    category_translations(name, locale)
                ),
                track_tags(tags(id, name, color))
            `)
            .eq('private_token', token)
            .eq('is_private', true)
            .single();

        if (error) {
            console.error('Error fetching private track:', error);
            throw error;
        }

        return this._flattenTrack(data);
    }

    /**
     * Generate a new private token for a track
     * @param {string} trackId - Track ID
     * @returns {Promise<string>} New private token
     */
    async generatePrivateToken(trackId) {
        // Generate a new UUID
        const { data, error } = await this.supabase
            .rpc('gen_random_uuid');

        if (error) {
            console.error('Error generating token:', error);
            throw error;
        }

        const newToken = data;

        // Update track with new token
        await this.update(trackId, { 
            private_token: newToken,
            is_private: true 
        });

        return newToken;
    }

    /**
     * Get the private link URL for a track
     * @param {string} token - Private token
     * @returns {string} Full URL to private track page
     */
    getPrivateTrackUrl(token) {
        // Get the base URL by removing everything after the last '/' from current URL
        // This works for both local (file:///) and production (https://...)
        const currentUrl = window.location.href;
        const lastSlash = currentUrl.lastIndexOf('/');
        const baseUrl = currentUrl.substring(0, lastSlash + 1);
        
        // If we're in admin folder, go up one level
        if (baseUrl.includes('/admin/')) {
            const adminIndex = baseUrl.lastIndexOf('/admin/');
            return baseUrl.substring(0, adminIndex + 1) + 'private-track.html?token=' + token;
        }
        
        return baseUrl + 'private-track.html?token=' + token;
    }

    /**
     * Get most popular tracks
     * @param {number} limit - Number of tracks to fetch
     * @returns {Promise<Array>} Array of tracks sorted by listeners then playcount
     */
    async getPopular(limit = 3) {
        const currentLang = this.getCurrentLanguage();
        
        const { data, error } = await this.supabase
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
            .eq('is_private', false) // Exclude private tracks
            .not('listeners', 'is', null)
            .order('listeners', { ascending: false })
            .order('playcount', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching popular tracks:', error);
            throw error;
        }

        return (data || []).map(track => this._flattenTrack(track, currentLang));
    }

    /**
     * Create a new track
     * @param {Object} trackData - Track data
     * @returns {Promise<Object>} Created track
     */
    async create(trackData) {
        const { data, error } = await this.supabase
            .from('tracks')
            .insert([{
                title: trackData.title,
                description: trackData.description,
                language: trackData.language || this.getCurrentLanguage(),
                category_id: trackData.category_id,
                spotify_id: trackData.spotify_id || null,
                mp3_url: trackData.mp3_url,
                license: trackData.license || false,
                is_private: trackData.is_private || false,
                private_token: trackData.is_private ? trackData.private_token || null : null
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating track:', error);
            throw error;
        }

        return data;
    }

    /**
     * Update a track
     * @param {string} trackId - Track ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated track
     */
    async update(trackId, updates) {
        const { data, error } = await this.supabase
            .from('tracks')
            .update(updates)
            .eq('id', trackId)
            .select();

        if (error) {
            console.error('Error updating track:', error);
            throw error;
        }

        return data;
    }

    /**
     * Delete a track
     * @param {string} trackId - Track ID
     */
    async delete(trackId) {
        // First, get the track to find the MP3 file
        const { data: track, error: fetchError } = await this.supabase
            .from('tracks')
            .select('mp3_url')
            .eq('id', trackId)
            .single();

        if (fetchError) {
            console.error('Error fetching track for deletion:', fetchError);
            throw fetchError;
        }

        // Delete from database first
        const { error: dbError } = await this.supabase
            .from('tracks')
            .delete()
            .eq('id', trackId);

        if (dbError) {
            console.error('Error deleting track from database:', dbError);
            throw dbError;
        }

        // Then delete the MP3 file from storage if it exists
        if (track?.mp3_url) {
            try {
                // Extract filename from URL
                // URL format: https://ongcmxiqyoeewcwmkndr.supabase.co/storage/v1/object/public/tracks/FILENAME
                const url = new URL(track.mp3_url);
                const pathParts = url.pathname.split('/');
                const filename = pathParts[pathParts.length - 1];

                if (filename) {
                    const { error: storageError } = await this.supabase
                        .storage
                        .from('tracks')
                        .remove([filename]);

                    if (storageError) {
                        console.error('Error deleting file from storage:', storageError);
                        // Don't throw - track is already deleted from DB
                    }
                }
            } catch (err) {
                console.error('Error parsing MP3 URL or deleting file:', err);
                // Don't throw - track is already deleted from DB
            }
        }
    }

    /**
     * Upload MP3 file to storage
     * @param {File} file - MP3 file
     * @returns {Promise<string>} Public URL of uploaded file
     */
    async uploadMp3(file) {
        // Sanitize filename
        const sanitizedFileName = this._sanitizeFilename(file.name);
        const fileName = `${Date.now()}-${sanitizedFileName}`;

        const { error: uploadError } = await this.supabase.storage
            .from('tracks')
            .upload(fileName, file);

        if (uploadError) {
            console.error('Error uploading file:', uploadError);
            throw uploadError;
        }

        // Get public URL
        const { data } = this.supabase.storage
            .from('tracks')
            .getPublicUrl(fileName);

        return data.publicUrl;
    }

    /**
     * Helper: Flatten track with category translation data
     * @private
     */
    _flattenTrack(track, currentLang = null) {
        if (track.categories && track.categories.category_translations) {
            // Find translation for current language or use first available
            const lang = currentLang || this.getCurrentLanguage();
            const categoryTranslation = track.categories.category_translations.find(
                t => t.locale === lang
            ) || track.categories.category_translations[0];
            
            track.category = {
                id: track.categories.id,
                image_url: track.categories.image_url,
                name: categoryTranslation?.name || '',
                body: categoryTranslation?.body || '',
                slug: categoryTranslation?.slug || '',
                locale: categoryTranslation?.locale || ''
            };
        }

        // Flatten tags
        if (track.track_tags) {
            track.tags = track.track_tags
                .map(tt => tt.tags)
                .filter(tag => tag !== null);
        }

        return track;
    }

    /**
     * Helper: Sanitize filename for storage
     * @private
     */
    _sanitizeFilename(filename) {
        return filename
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[åä]/gi, 'a')
            .replace(/ö/gi, 'o')
            .replace(/[^a-zA-Z0-9.-]/g, '_');
    }
}

// Export for use in other files
window.TrackModel = TrackModel;
