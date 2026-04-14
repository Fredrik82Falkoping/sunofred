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
                spotify_url: trackData.spotify_url || null,
                mp3_url: trackData.mp3_url,
                license: trackData.license || false
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
        const { error } = await this.supabase
            .from('tracks')
            .delete()
            .eq('id', trackId);

        if (error) {
            console.error('Error deleting track:', error);
            throw error;
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
