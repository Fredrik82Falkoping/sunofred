/**
 * Browse Page - Refactored with MVC pattern
 * Uses Category and Tag models for data operations
 */

// Initialize models when supabase is ready
let categoryModel;
let tagModel;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize models
    categoryModel = new CategoryModel(supabaseClient);
    tagModel = new TagModel(supabaseClient);
    
    // Load data
    loadPage();
});

/**
 * Main page load function
 */
async function loadPage() {
    await Promise.all([
        loadCategoriesWithCounts(),
        loadTagsWithCounts()
    ]);
}

/**
 * Load and display categories with track counts
 */
async function loadCategoriesWithCounts() {
    try {
        const categories = await categoryModel.getAllWithTrackCounts();
        displayCategories(categories);
    } catch (error) {
        console.error('Error loading categories:', error);
        document.getElementById('categoriesGrid').innerHTML = 
            '<p class="error">Could not load categories</p>';
    }
}

/**
 * Load and display tags with track counts
 */
async function loadTagsWithCounts() {
    try {
        const tags = await tagModel.getAllWithTrackCounts();
        displayTags(tags);
    } catch (error) {
        console.error('Error loading tags:', error);
        document.getElementById('tagsCloud').innerHTML = 
            '<p class="error">Could not load tags</p>';
    }
}

/**
 * Display categories as cards
 * @param {Array} categories - Categories with trackCount
 */
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
               class="category-card ${category.image_url ? 'has-image' : 'no-image'}">
                    <div class="category-icon">
                        ${category.image_url ? `
                            <img src="${category.image_url}" alt="${category.name}" />
                        </div>
                        ` : `                     
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                            </svg>
                        `}
                    </div>
                <h4 class="category-name">${category.name}</h4>
                <p class="category-count">${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}</p>
            </a>
        `;
    }).join('');

    container.innerHTML = html;
}

/**
 * Display tags as a tag cloud
 * @param {Array} tags - Tags with trackCount
 */
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
