// Multi-upload functionality

let trackCounter = 0;
let tagTimeout;

// Add first track on page load
document.addEventListener('DOMContentLoaded', () => {
    addTrackItem();
    setupTagAutocomplete();
});

// Add track button
document.getElementById('addTrackBtn')?.addEventListener('click', () => {
    addTrackItem();
});

// Function to add a new track item
function addTrackItem() {
    trackCounter++;
    const tracksContainer = document.getElementById('tracksContainer');
    
    const trackItem = document.createElement('div');
    trackItem.className = 'track-item';
    trackItem.dataset.trackId = trackCounter;
    
    trackItem.innerHTML = `
        <div class="track-item-header">
            <h4>🎵 Track ${trackCounter}</h4>
            ${trackCounter > 1 ? '<button type="button" class="remove-track-btn" onclick="removeTrackItem(this)">Remove</button>' : ''}
        </div>
        
        <div class="form-group">
            <label for="title_${trackCounter}">Track Title *</label>
            <input type="text" name="title_${trackCounter}" id="title_${trackCounter}" placeholder="Enter song title" required />
        </div>

        <div class="form-group">
            <label for="description_${trackCounter}">Description *</label>
            <textarea name="description_${trackCounter}" id="description_${trackCounter}" placeholder="Enter song description" rows="3" required></textarea>
        </div>

        <div class="form-group">
            <label for="spotify_url_${trackCounter}">Spotify URL (optional)</label>
            <input type="url" name="spotify_url_${trackCounter}" id="spotify_url_${trackCounter}" placeholder="https://open.spotify.com/track/..." />
        </div>

        <div class="form-group">
            <label for="mp3_${trackCounter}">MP3 File *</label>
            <input type="file" name="mp3_${trackCounter}" id="mp3_${trackCounter}" accept="audio/mpeg" required />
            <small style="color: #666; font-size: 12px;">The filename will auto-fill the title field</small>
        </div>
    `;
    
    tracksContainer.appendChild(trackItem);
    
    // Add event listener to auto-fill title from filename
    const mp3Input = trackItem.querySelector(`#mp3_${trackCounter}`);
    const titleInput = trackItem.querySelector(`#title_${trackCounter}`);
    
    mp3Input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        // Only auto-fill if title is empty
        if (file && !titleInput.value.trim()) {
            // Remove file extension and clean up the name
            let filename = file.name.replace(/\.[^/.]+$/, '');
            // Replace underscores and hyphens with spaces
            filename = filename.replace(/[_-]/g, ' ');
            // Capitalize first letter of each word
            filename = filename.replace(/\b\w/g, l => l.toUpperCase());
            
            titleInput.value = filename;
        }
    });
}

// Function to remove a track item
function removeTrackItem(button) {
    const trackItem = button.closest('.track-item');
    trackItem.remove();
    
    // Renumber remaining tracks
    const remainingTracks = document.querySelectorAll('.track-item');
    remainingTracks.forEach((item, index) => {
        const newNumber = index + 1;
        const header = item.querySelector('h4');
        header.textContent = `🎵 Track ${newNumber}`;
    });
}

// Handle form submission
document.getElementById('multiTrackForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const progressContainer = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBarFill');
    const progressStatus = document.getElementById('progressStatus');
    
    // Get shared values
    const language = form.language.value;
    const license = form.license.checked;
    const sharedTagsInput = document.getElementById('sharedTags')?.value || '';
    const sharedTagNames = parseTagString(sharedTagsInput);
    
    // Handle category
    let categoryId = form.category_id.value;
    
    if (!categoryId) {
        alert("Please select a category");
        return;
    }
    
    if (categoryId === "__new__") {
        const newCategoryName = document.getElementById("newCategoryName").value.trim();
        
        if (!newCategoryName) {
            alert("Please enter a category name");
            document.getElementById("newCategoryName").focus();
            return;
        }

        const newCategory = await createCategory(newCategoryName);
        if (!newCategory) return;
        
        categoryId = newCategory.id;
    }
    
    // Get all track items
    const trackItems = document.querySelectorAll('.track-item');
    
    if (trackItems.length === 0) {
        alert("Please add at least one track");
        return;
    }
    
    // Collect all tracks data
    const tracks = [];
    for (const trackItem of trackItems) {
        const trackId = trackItem.dataset.trackId;
        
        const title = document.getElementById(`title_${trackId}`).value;
        const description = document.getElementById(`description_${trackId}`).value;
        const spotify_url = document.getElementById(`spotify_url_${trackId}`).value;
        const mp3File = document.getElementById(`mp3_${trackId}`).files[0];
        
        if (!mp3File) {
            alert(`Please select an MP3 file for "${title}"`);
            return;
        }
        
        tracks.push({
            title,
            description,
            spotify_url: spotify_url || null,
            mp3File,
            language,
            category_id: categoryId,
            license
        });
    }
    
    // Show progress
    progressContainer.classList.add('active');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';
    
    // Upload tracks one by one
    let successCount = 0;
    const totalTracks = tracks.length;
    
    for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const trackNumber = i + 1;
        
        try {
            progressStatus.textContent = `Uploading track ${trackNumber} of ${totalTracks}: ${track.title}`;
            
            // 1. Upload file to Storage
            // Sanitize filename to handle special characters (åäö, apostrophes, etc.)
            const sanitizedFileName = track.mp3File.name
                .normalize('NFD') // Decompose accented characters
                .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                .replace(/[åä]/gi, 'a') // Replace å, ä with a
                .replace(/ö/gi, 'o') // Replace ö with o
                .replace(/[^a-zA-Z0-9.-]/g, '_'); // Replace other special chars with underscore
            
            const fileName = `${Date.now()}-${sanitizedFileName}`;
            
            const { error: uploadError } = await supabaseClient
                .storage
                .from("tracks")
                .upload(fileName, track.mp3File);

            if (uploadError) {
                throw new Error(`Failed to upload file for "${track.title}": ${uploadError.message}`);
            }

            // 2. Get public URL
            const { data } = supabaseClient
                .storage
                .from("tracks")
                .getPublicUrl(fileName);

            const mp3_url = data.publicUrl;

            // 3. Save to database
            const { data: insertedTrack, error: dbError } = await supabaseClient
                .from("tracks")
                .insert([{
                    title: track.title,
                    description: track.description,
                    language: track.language,
                    category_id: track.category_id,
                    spotify_url: track.spotify_url,
                    mp3_url: mp3_url,
                    license: track.license
                }])
                .select()
                .single();

            if (dbError) {
                throw new Error(`Failed to save track "${track.title}": ${dbError.message}`);
            }
            
            // 4. Add tags to track
            if (sharedTagNames.length > 0 && insertedTrack) {
                await addTagsToTrack(insertedTrack.id, sharedTagNames);
            }
            
            successCount++;
            
            // Update progress bar
            const progress = Math.round((trackNumber / totalTracks) * 100);
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${progress}%`;
            
        } catch (error) {
            console.error('Upload error:', error);
            alert(error.message);
            
            // Update status
            progressStatus.textContent = `Error uploading track ${trackNumber}. ${successCount} of ${totalTracks} tracks uploaded successfully.`;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload All Tracks';
            return;
        }
    }
    
    // Success!
    progressStatus.textContent = `✅ Success! All ${totalTracks} tracks uploaded successfully!`;
    
    alert(`Successfully uploaded ${totalTracks} track(s)!`);
    
    // Reset form
    setTimeout(() => {
        form.reset();
        document.getElementById('tracksContainer').innerHTML = '';
        trackCounter = 0;
        addTrackItem();
        progressContainer.classList.remove('active');
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload All Tracks';
        
        // Reload categories
        loadCategories();
    }, 2000);
});

// ============================================
// Tag Autocomplete Functionality
// ============================================

function setupTagAutocomplete() {
    const tagsInput = document.getElementById('sharedTags');
    const suggestionsContainer = document.getElementById('sharedTagSuggestions');
    
    if (!tagsInput || !suggestionsContainer) return;
    
    tagsInput.addEventListener('input', function(e) {
        clearTimeout(tagTimeout);
        
        const value = e.target.value;
        const lastCommaIndex = value.lastIndexOf(',');
        const currentTag = lastCommaIndex >= 0 
            ? value.substring(lastCommaIndex + 1).trim() 
            : value.trim();
        
        if (currentTag.length < 2) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        tagTimeout = setTimeout(async () => {
            const suggestions = await searchTags(currentTag);
            displayTagSuggestions(suggestions, value, lastCommaIndex);
        }, 300);
    });
    
    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.tag-input-container')) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
        }
    });
}

function displayTagSuggestions(suggestions, currentValue, lastCommaIndex) {
    const container = document.getElementById('sharedTagSuggestions');
    
    if (!suggestions || suggestions.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    
    container.innerHTML = '';
    container.style.display = 'block';
    
    suggestions.forEach(tag => {
        const div = document.createElement('div');
        div.className = 'tag-suggestion-item';
        div.textContent = tag.name;
        div.style.color = tag.color;
        
        div.addEventListener('click', function() {
            const tagsInput = document.getElementById('sharedTags');
            const beforeCurrent = lastCommaIndex >= 0 
                ? currentValue.substring(0, lastCommaIndex + 1) 
                : '';
            
            tagsInput.value = beforeCurrent + (beforeCurrent ? ' ' : '') + tag.name + ', ';
            container.innerHTML = '';
            container.style.display = 'none';
            tagsInput.focus();
        });
        
        container.appendChild(div);
    });
}
