// Browse page functionality - loads categories and tags

// Load categories with track counts
async function loadCategoriesWithCounts() {
    try {
        const currentLang = window.languageFilter.getCurrentLanguage();
        
        // Get all categories
        const { data: categories, error: catError } = await supabaseClient
            .from('categories')
            .select('id, name, slug')
            .order('name');

        if (catError) {
            console.error('Error loading categories:', catError);
            document.getElementById('categoriesGrid').innerHTML = 
                '<p class="error">Could not load categories</p>';
            return;
        }

        if (!categories || categories.length === 0) {
            document.getElementById('categoriesGrid').innerHTML = 
                '<p class="no-results">No categories found</p>';
            return;
        }

        // Get track counts for each category, filtered by language
        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const { count, error } = await supabaseClient
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

        displayCategories(categoriesWithCounts);
    } catch (err) {
        console.error('Error:', err);
        document.getElementById('categoriesGrid').innerHTML = 
            '<p class="error">An error occurred</p>';
    }
}

// Display categories as cards
function displayCategories(categories) {
    const container = document.getElementById('categoriesGrid');
    
    // Filter out categories with no tracks
    const categoriesWithTracks = categories.filter(cat => cat.trackCount > 0);

    if (categoriesWithTracks.length === 0) {
        container.innerHTML = '<p class="no-results">No categories with tracks found</p>';
        return;
    }

    const html = categoriesWithTracks.map(category => {
        const trackCount = category.trackCount;
        return `
            <a href="category.html?id=${category.id}&name=${encodeURIComponent(category.name)}" 
               class="category-card">
                <div class="category-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                </div>
                <h4 class="category-name">${category.name}</h4>
                <p class="category-count">${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}</p>
            </a>
        `;
    }).join('');

    container.innerHTML = html;
}

// Load tags with track counts
async function loadTagsWithCounts() {
    try {
        const currentLang = window.languageFilter.getCurrentLanguage();
        
        // Get all tags
        const { data: tags, error: tagsError } = await supabaseClient
            .from('tags')
            .select('id, name, color')
            .order('name');

        if (tagsError) {
            console.error('Error loading tags:', tagsError);
            document.getElementById('tagsCloud').innerHTML = 
                '<p class="error">Could not load tags</p>';
            return;
        }

        if (!tags || tags.length === 0) {
            document.getElementById('tagsCloud').innerHTML = 
                '<p class="no-results">No tags found</p>';
            return;
        }

        // Get track counts for each tag, filtered by language
        const tagsWithCounts = await Promise.all(
            tags.map(async (tag) => {
                // First get tracks with this tag and language
                const { data: trackTags, error } = await supabaseClient
                    .from('track_tags')
                    .select('track_id')
                    .eq('tag_id', tag.id);
                
                if (!trackTags || trackTags.length === 0) {
                    return {
                        ...tag,
                        trackCount: 0
                    };
                }
                
                // Then filter by language
                const trackIds = trackTags.map(tt => tt.track_id);
                const { count } = await supabaseClient
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

        displayTags(tagsWithCounts);
    } catch (err) {
        console.error('Error:', err);
        document.getElementById('tagsCloud').innerHTML = 
            '<p class="error">An error occurred</p>';
    }
}

// Display tags as a tag cloud
function displayTags(tags) {
    const container = document.getElementById('tagsCloud');
    
    // Filter out tags with no tracks
    const tagsWithTracks = tags.filter(tag => tag.trackCount > 0);

    if (tagsWithTracks.length === 0) {
        container.innerHTML = '<p class="no-results">No tags with tracks found</p>';
        return;
    }

    // Calculate min and max counts for sizing
    const counts = tagsWithTracks.map(tag => tag.trackCount);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    
    const html = tagsWithTracks.map(tag => {
        const trackCount = tag.trackCount;
        
        // Calculate size based on count (between 1 and 2.5)
        const sizeMultiplier = maxCount === minCount 
            ? 1.5 
            : 1 + ((trackCount - minCount) / (maxCount - minCount)) * 1.5;
        
        const fontSize = sizeMultiplier;
        
        return `
            <a href="tag.html?id=${tag.id}&name=${encodeURIComponent(tag.name)}" 
               class="tag-cloud-item"
               style="background-color: ${tag.color}20; 
                      color: ${tag.color}; 
                      font-size: ${fontSize}em;
                      border-color: ${tag.color}40"
               title="${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}">
                ${tag.name}
                <span class="tag-count">${trackCount}</span>
            </a>
        `;
    }).join('');

    container.innerHTML = html;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCategoriesWithCounts();
    loadTagsWithCounts();
});
