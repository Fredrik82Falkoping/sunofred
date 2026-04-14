/**
 * Tag Model - Data layer for tags
 * Handles all database operations for tags
 */

class TagModel {
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
     * Get all tags with track counts for current language
     * @returns {Promise<Array>} Array of tags with trackCount property
     */
    async getAllWithTrackCounts() {
        const currentLang = this.getCurrentLanguage();

        // Get all tags
        const { data: tags, error } = await this.supabase
            .from('tags')
            .select('id, name, color')
            .order('name');

        if (error) {
            console.error('Error fetching tags:', error);
            throw error;
        }

        if (!tags || tags.length === 0) {
            return [];
        }

        // Get track counts for each tag
        const tagsWithCounts = await Promise.all(
            tags.map(async (tag) => {
                // Get tracks with this tag
                const { data: trackTags } = await this.supabase
                    .from('track_tags')
                    .select('track_id')
                    .eq('tag_id', tag.id);
                
                if (!trackTags || trackTags.length === 0) {
                    return {
                        ...tag,
                        trackCount: 0
                    };
                }
                
                // Filter by language
                const trackIds = trackTags.map(tt => tt.track_id);
                const { count } = await this.supabase
                    .from('tracks')
                    .select('*', { count: 'exact', head: true })
                    .in('id', trackIds)
                    .eq('language', currentLang);
                
                return {
                    ...tag,
                    trackCount: count || 0
                };
            })
        );

        return tagsWithCounts;
    }

    /**
     * Get or create a tag by name
     * @param {string} name - Tag name
     * @param {string} color - Optional color (defaults to #3B82F6)
     * @returns {Promise<Object>} Tag object
     */
    async getOrCreate(name, color = '#3B82F6') {
        const normalizedName = name.trim().toLowerCase();
        
        if (!normalizedName) {
            return null;
        }
        
        // Check if tag exists (case-insensitive)
        const { data: existing, error: checkError } = await this.supabase
            .from('tags')
            .select('*')
            .ilike('name', normalizedName)
            .single();
        
        if (existing) {
            return existing;
        }
        
        // Create new tag
        const { data, error } = await this.supabase
            .from('tags')
            .insert([{ 
                name: normalizedName,
                color: color
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating tag:', error);
            throw error;
        }

        return data;
    }

    /**
     * Search tags by partial name
     * @param {string} searchTerm - Search term
     * @param {number} limit - Max results (default 10)
     * @returns {Promise<Array>} Array of matching tags
     */
    async search(searchTerm, limit = 10) {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }
        
        const { data, error } = await this.supabase
            .from('tags')
            .select('*')
            .ilike('name', `%${searchTerm.trim()}%`)
            .order('name')
            .limit(limit);

        if (error) {
            console.error('Error searching tags:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Add tags to a track
     * @param {string} trackId - Track ID
     * @param {Array<string>} tagNames - Array of tag names
     * @returns {Promise<boolean>} Success status
     */
    async addToTrack(trackId, tagNames) {
        if (!tagNames || tagNames.length === 0) {
            return true;
        }
        
        // Get or create all tags
        const tagPromises = tagNames.map(name => this.getOrCreate(name));
        const tags = await Promise.all(tagPromises);
        
        // Filter out any nulls
        const validTags = tags.filter(tag => tag !== null);
        
        if (validTags.length === 0) {
            return true;
        }
        
        // Create track_tags relationships
        const trackTags = validTags.map(tag => ({
            track_id: trackId,
            tag_id: tag.id
        }));
        
        const { error } = await this.supabase
            .from('track_tags')
            .insert(trackTags);

        if (error) {
            console.error('Error adding tags to track:', error);
            throw error;
        }

        return true;
    }

    /**
     * Update tags for a track (removes old, adds new)
     * @param {string} trackId - Track ID
     * @param {Array<string>} tagNames - Array of tag names
     * @returns {Promise<boolean>} Success status
     */
    async updateForTrack(trackId, tagNames) {
        // Remove existing tags
        await this.supabase
            .from('track_tags')
            .delete()
            .eq('track_id', trackId);

        // Add new tags
        return await this.addToTrack(trackId, tagNames);
    }

    /**
     * Parse comma-separated tag string
     * @param {string} tagString - Comma-separated tags
     * @returns {Array<string>} Array of tag names
     */
    parseTagString(tagString) {
        if (!tagString || tagString.trim().length === 0) {
            return [];
        }
        
        return tagString
            .split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0);
    }
}

// Export for use in other files
window.TagModel = TagModel;
