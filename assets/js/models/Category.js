/**
 * Category Model - Data layer for categories
 * Handles all database operations for categories
 */

class CategoryModel {
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
     * Fetch all categories with translations for current language
     * @param {string} locale - Optional locale override
     * @returns {Promise<Array>} Array of categories with flattened translation data
     */
    async getAll(locale = null) {
        const currentLang = locale || this.getCurrentLanguage();
        
        const { data, error } = await this.supabase
            .from('categories')
            .select(`
                id,
                image_url,
                created_at,
                category_translations(
                    id,
                    name,
                    slug,
                    body,
                    locale
                )
            `)
            .eq('category_translations.locale', currentLang);

        if (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }

        // Filter categories with translations, flatten and sort
        const categories = (data || [])
            .filter(cat => cat.category_translations && cat.category_translations.length > 0)
            .map(cat => this._flattenCategory(cat))
            .sort((a, b) => a.name.localeCompare(b.name));

        return categories;
    }

    /**
     * Get a single category by ID with translation
     * @param {string} id - Category ID
     * @param {string} locale - Optional locale override
     * @returns {Promise<Object>} Category with flattened translation data
     */
    async getById(id, locale = null) {
        const currentLang = locale || this.getCurrentLanguage();
        
        const { data, error } = await this.supabase
            .from('categories')
            .select(`
                id,
                image_url,
                created_at,
                category_translations(
                    id,
                    name,
                    slug,
                    body,
                    locale
                )
            `)
            .eq('id', id)
            .eq('category_translations.locale', currentLang)
            .single();

        if (error) {
            console.error('Error fetching category:', error);
            throw error;
        }

        return this._flattenCategory(data);
    }

    /**
     * Get categories with track counts for current language
     * @returns {Promise<Array>} Categories with trackCount property
     */
    async getAllWithTrackCounts() {
        const currentLang = this.getCurrentLanguage();
        const categories = await this.getAll();

        // Get track counts for each category
        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const { count, error } = await this.supabase
                    .from('tracks')
                    .select('*', { count: 'exact', head: true })
                    .eq('category_id', category.id)
                    .eq('language', currentLang);
                
                return {
                    ...category,
                    trackCount: count || 0
                };
            })
        );

        return categoriesWithCounts;
    }

    /**
     * Create a new category with translation
     * @param {string} name - Category name
     * @param {Object} options - Additional options (body, locale)
     * @returns {Promise<Object>} Created category
     */
    async create(name, options = {}) {
        const locale = options.locale || this.getCurrentLanguage();
        const slug = this._generateSlug(name);
        
        // Check if translation already exists
        const existing = await this._findExistingTranslation(name, slug, locale);
        if (existing) {
            console.log('Category already exists:', existing.name);
            return existing;
        }

        // Create category record first
        const { data: newCategory, error: categoryError } = await this.supabase
            .from('categories')
            .insert([{ 
                image_url: options.image_url || null 
            }])
            .select()
            .single();

        if (categoryError) {
            console.error('Error creating category:', categoryError);
            throw categoryError;
        }

        // Then create the translation
        const { data: translation, error: translationError } = await this.supabase
            .from('category_translations')
            .insert([{
                category_id: newCategory.id,
                locale: locale,
                name: name,
                slug: slug,
                body: options.body || null
            }])
            .select()
            .single();

        if (translationError) {
            console.error('Error creating translation:', translationError);
            
            // Cleanup: delete the category we just created
            await this.supabase
                .from('categories')
                .delete()
                .eq('id', newCategory.id);
            
            throw translationError;
        }

        return {
            ...newCategory,
            translation_id: translation.id,
            name: translation.name,
            slug: translation.slug,
            body: translation.body,
            locale: translation.locale
        };
    }

    /**
     * Update category and/or translation
     * @param {string} categoryId - Category ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated category
     */
    async update(categoryId, updates) {
        const locale = updates.locale || this.getCurrentLanguage();

        // Update category fields (image_url)
        if (updates.image_url !== undefined) {
            const { error: categoryError } = await this.supabase
                .from('categories')
                .update({ image_url: updates.image_url })
                .eq('id', categoryId);

            if (categoryError) {
                console.error('Error updating category:', categoryError);
                throw categoryError;
            }
        }

        // Update translation fields (name, body, slug)
        if (updates.name || updates.body !== undefined || updates.slug) {
            const translationUpdates = {};
            
            if (updates.name) {
                translationUpdates.name = updates.name;
                translationUpdates.slug = this._generateSlug(updates.name);
            }
            if (updates.body !== undefined) {
                translationUpdates.body = updates.body;
            }
            if (updates.slug) {
                translationUpdates.slug = updates.slug;
            }

            const { error: translationError } = await this.supabase
                .from('category_translations')
                .update(translationUpdates)
                .eq('category_id', categoryId)
                .eq('locale', locale);

            if (translationError) {
                console.error('Error updating translation:', translationError);
                throw translationError;
            }
        }

        return await this.getById(categoryId, locale);
    }

    /**
     * Delete a category (cascades to translations)
     * @param {string} categoryId - Category ID
     */
    async delete(categoryId) {
        const { error } = await this.supabase
            .from('categories')
            .delete()
            .eq('id', categoryId);

        if (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    }

    /**
     * Copy category translation to another language
     * @param {string} categoryId - Category ID
     * @param {string} fromLocale - Source locale
     * @param {string} toLocale - Target locale
     * @returns {Promise<Object>} Created translation
     */
    async copyToLanguage(categoryId, fromLocale, toLocale) {
        // Check if translation already exists for target locale
        const { data: existing } = await this.supabase
            .from('category_translations')
            .select('*')
            .eq('category_id', categoryId)
            .eq('locale', toLocale)
            .single();

        if (existing) {
            throw new Error(`Translation for locale '${toLocale}' already exists`);
        }

        // Get the source translation
        const { data: source, error: sourceError } = await this.supabase
            .from('category_translations')
            .select('*')
            .eq('category_id', categoryId)
            .eq('locale', fromLocale)
            .single();

        if (sourceError || !source) {
            throw new Error(`Source translation for locale '${fromLocale}' not found`);
        }

        // Create new translation
        const { data: newTranslation, error: createError } = await this.supabase
            .from('category_translations')
            .insert([{
                category_id: categoryId,
                locale: toLocale,
                name: source.name,
                slug: source.slug,
                body: source.body
            }])
            .select()
            .single();

        if (createError) {
            console.error('Error creating translation:', createError);
            throw createError;
        }

        return newTranslation;
    }

    /**
     * Delete a category translation
     * If it's the last translation, also delete the category
     * @param {string} categoryId - Category ID
     * @param {string} locale - Locale to delete
     * @returns {Promise<Object>} Result object with deletedTranslation and deletedCategory flags
     */
    async deleteTranslation(categoryId, locale) {
        // First check if there are any tracks for this category in this language
        const { count: trackCount } = await this.supabase
            .from('tracks')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', categoryId)
            .eq('language', locale);

        if (trackCount > 0) {
            throw new Error(`Cannot delete: ${trackCount} track(s) exist for this category in this language`);
        }

        // Get all translations for this category
        const { data: allTranslations } = await this.supabase
            .from('category_translations')
            .select('*')
            .eq('category_id', categoryId);

        // Delete the translation
        const { error: translationError } = await this.supabase
            .from('category_translations')
            .delete()
            .eq('category_id', categoryId)
            .eq('locale', locale);

        if (translationError) {
            console.error('Error deleting translation:', translationError);
            throw translationError;
        }

        let deletedCategory = false;

        // If this was the last translation, check if we should delete the category
        if (allTranslations.length === 1) {
            // Check if there are any tracks for this category in ANY language
            const { count: totalTrackCount } = await this.supabase
                .from('tracks')
                .select('*', { count: 'exact', head: true })
                .eq('category_id', categoryId);

            if (totalTrackCount === 0) {
                // Safe to delete the category
                const { error: categoryError } = await this.supabase
                    .from('categories')
                    .delete()
                    .eq('id', categoryId);

                if (categoryError) {
                    console.error('Error deleting category:', categoryError);
                    throw categoryError;
                }

                deletedCategory = true;
            }
        }

        return {
            deletedTranslation: true,
            deletedCategory: deletedCategory
        };
    }

    /**
     * Check if a category can be deleted (no tracks in specified language)
     * @param {string} categoryId - Category ID
     * @param {string} locale - Locale to check
     * @returns {Promise<Object>} Object with canDelete flag and trackCount
     */
    async canDeleteTranslation(categoryId, locale) {
        const { count: trackCount } = await this.supabase
            .from('tracks')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', categoryId)
            .eq('language', locale);

        return {
            canDelete: trackCount === 0,
            trackCount: trackCount || 0
        };
    }

    /**
     * Helper: Flatten category with translation data
     * @private
     */
    _flattenCategory(category) {
        if (!category.category_translations || category.category_translations.length === 0) {
            return {
                id: category.id,
                image_url: category.image_url,
                created_at: category.created_at,
                translation_id: null,
                name: '',
                slug: '',
                body: null,
                locale: null
            };
        }

        const translation = category.category_translations[0];
        
        return {
            id: category.id,
            image_url: category.image_url,
            created_at: category.created_at,
            translation_id: translation.id,
            name: translation.name,
            slug: translation.slug,
            body: translation.body,
            locale: translation.locale
        };
    }

    /**
     * Helper: Generate URL-friendly slug from name
     * @private
     */
    _generateSlug(name) {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[åä]/gi, 'a')
            .replace(/ö/gi, 'o')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    /**
     * Helper: Find existing translation by name or slug
     * @private
     */
    async _findExistingTranslation(name, slug, locale) {
        const { data, error } = await this.supabase
            .from('category_translations')
            .select(`
                *,
                categories(id, image_url)
            `)
            .eq('locale', locale)
            .or(`name.ilike.${name},slug.eq.${slug}`)
            .single();

        if (error || !data) {
            return null;
        }

        return {
            id: data.categories.id,
            image_url: data.categories.image_url,
            translation_id: data.id,
            name: data.name,
            slug: data.slug,
            body: data.body,
            locale: data.locale
        };
    }
}

// Export for use in other files
window.CategoryModel = CategoryModel;
