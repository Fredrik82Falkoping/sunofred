// Initialize models
const trackModel = new TrackModel(supabaseClient);
const tagModel = new TagModel(supabaseClient);
const categoryModel = new CategoryModel(supabaseClient);

let trackId = null;
let currentTrack = null;

// Get track ID from URL
const urlParams = new URLSearchParams(window.location.search);
trackId = urlParams.get('id');

if (!trackId) {
    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('errorMessage').textContent = 'No track ID provided';
    document.getElementById('errorMessage').style.display = 'block';
} else {
    loadTrackData();
}

async function loadTrackData() {
    try {
        // Check if user is authenticated
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            window.location.href = '../login.html';
            return;
        }

        // Load track data using model
        currentTrack = await trackModel.getById(trackId);
        
        populateForm(currentTrack);
        await loadCategories();
        
        document.getElementById('loadingMessage').style.display = 'none';
        document.getElementById('formContainer').style.display = 'block';
    } catch (err) {
        console.error('Error loading track:', err);
        document.getElementById('loadingMessage').style.display = 'none';
        document.getElementById('errorMessage').textContent = 'Error loading track: ' + err.message;
        document.getElementById('errorMessage').style.display = 'block';
    }
}

function populateForm(track) {
    document.getElementById('title').value = track.title || '';
    document.getElementById('description').value = track.description || '';
    document.getElementById('language').value = track.language || '';
    document.getElementById('spotify_url').value = track.spotify_url || '';
    document.getElementById('license').checked = track.license || false;

    // Set current MP3
    if (track.mp3_url) {
        document.getElementById('currentMp3Player').src = track.mp3_url;
    }

    // Extract tags using flattened tags array from model
    const tags = track.tags?.map(tag => tag.name).join(', ') || '';
    document.getElementById('tags').value = tags;
}

async function loadCategories() {
    // Get categories using model
    const categories = await categoryModel.getAll();

    const select = document.getElementById('categorySelect');
    
    // Clear existing options except first two
    while (select.options.length > 2) {
        select.remove(2);
    }

    // Add categories
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        if (currentTrack.category_id === cat.id) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

// Category handling
document.getElementById('categorySelect')?.addEventListener('change', function() {
    const newCategoryInput = document.getElementById('newCategoryInput');
    if (this.value === '__new__') {
        newCategoryInput.style.display = 'block';
        document.getElementById('newCategoryName').focus();
    } else {
        newCategoryInput.style.display = 'none';
    }
});

document.getElementById('cancelNewCategory')?.addEventListener('click', () => {
    document.getElementById('categorySelect').value = currentTrack.category_id || '';
    document.getElementById('newCategoryInput').style.display = 'none';
});

// Tag autocomplete
let tagSuggestionsTimeout;
document.getElementById('tags')?.addEventListener('input', async function(e) {
    clearTimeout(tagSuggestionsTimeout);
    
    const value = e.target.value;
    const lastCommaIndex = value.lastIndexOf(',');
    const currentTag = lastCommaIndex >= 0 
        ? value.substring(lastCommaIndex + 1).trim()
        : value.trim();

    if (currentTag.length < 2) {
        document.getElementById('tagSuggestions').style.display = 'none';
        return;
    }

    tagSuggestionsTimeout = setTimeout(async () => {
        const suggestions = await tagModel.search(currentTag);
        showTagSuggestions(suggestions, currentTag);
    }, 300);
});

function showTagSuggestions(suggestions, currentTag) {
    const container = document.getElementById('tagSuggestions');
    
    if (!suggestions || suggestions.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.innerHTML = suggestions.map(tag => `
        <div class="tag-suggestion" data-tag="${tag.name}">
            <span class="tag-dot" style="background-color: ${tag.color}"></span>
            ${tag.name}
        </div>
    `).join('');
    container.style.display = 'block';

    container.querySelectorAll('.tag-suggestion').forEach(elem => {
        elem.addEventListener('click', () => {
            const tagInput = document.getElementById('tags');
            const value = tagInput.value;
            const lastCommaIndex = value.lastIndexOf(',');
            
            if (lastCommaIndex >= 0) {
                tagInput.value = value.substring(0, lastCommaIndex + 1) + ' ' + elem.dataset.tag + ', ';
            } else {
                tagInput.value = elem.dataset.tag + ', ';
            }
            
            container.style.display = 'none';
            tagInput.focus();
        });
    });
}

// Hide suggestions on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.tag-input-container')) {
        document.getElementById('tagSuggestions').style.display = 'none';
    }
});

// Form submission
document.getElementById('trackForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    try {
        const formData = new FormData(e.target);
        
        // Handle category
        let categoryId = formData.get('category_id');
        if (categoryId === '__new__') {
            const newCategoryName = document.getElementById('newCategoryName').value.trim();
            if (!newCategoryName) {
                alert('Please enter a category name');
                submitButton.disabled = false;
                submitButton.textContent = 'Save Changes';
                return;
            }
            // Use CategoryModel to create new category
            const newCategory = await categoryModel.create(newCategoryName);
            categoryId = newCategory.id;
        }

        // Prepare track data
        const trackData = {
            title: formData.get('title'),
            description: formData.get('description'),
            language: formData.get('language'),
            category_id: categoryId,
            spotify_url: formData.get('spotify_url') || null,
            license: formData.get('license') === 'on'
        };

        // Handle MP3 file if provided
        const mp3File = formData.get('mp3');
        if (mp3File && mp3File.size > 0) {
            // Use TrackModel to upload MP3
            const mp3Url = await trackModel.uploadMp3(mp3File);
            trackData.mp3_url = mp3Url;
        }

        // Update track using model
        await trackModel.update(trackId, trackData);

        // Handle tags - always update them (even if empty)
        const tagsString = formData.get('tags') || '';
        const tagNames = tagModel.parseTagString(tagsString);
        await tagModel.updateForTrack(trackId, tagNames);

        alert('Track updated successfully!');
        window.history.back();
    } catch (err) {
        console.error('Error updating track:', err);
        alert('Error updating track: ' + err.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Changes';
    }
});

// Cancel button
document.getElementById('cancelButton')?.addEventListener('click', () => {
    window.history.back();
});

// Delete button
document.getElementById('deleteButton')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete this track? This action cannot be undone.')) {
        return;
    }

    try {
        // Use TrackModel to delete
        await trackModel.delete(trackId);

        alert('Track deleted successfully');
        window.location.href = '../browse.html';
    } catch (err) {
        console.error('Error deleting track:', err);
        alert('Error deleting track: ' + err.message);
    }
});

// Check auth on load
