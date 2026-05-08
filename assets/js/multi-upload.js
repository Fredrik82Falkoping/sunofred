// Multi-upload functionality

// Initialize models
const categoryModel = new CategoryModel(supabaseClient);
const tagModel = new TagModel(supabaseClient);

let trackCounter = 0;
let tagTimeout;

// Add first track on page load
document.addEventListener('DOMContentLoaded', () => {
    addTrackItem();
    setupTagAutocomplete();
    loadCategories();
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
            <label for="spotify_id_${trackCounter}">Spotify ID (optional)</label>
            <input type="text" name="spotify_id_${trackCounter}" id="spotify_id_${trackCounter}" />
        </div>

        <div class="form-group">
            <label for="mp3_${trackCounter}">MP3 File *</label>
            <input type="file" name="mp3_${trackCounter}" id="mp3_${trackCounter}" accept="audio/mpeg" required />
            <small style="color: #aaa; font-size: 12px;">The filename will auto-fill the title field</small>
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
    const isPrivate = form.is_private?.checked || false;
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
        const spotify_id = document.getElementById(`spotify_id_${trackId}`).value;
        const mp3File = document.getElementById(`mp3_${trackId}`).files[0];
        
        if (!mp3File) {
            alert(`Please select an MP3 file for "${title}"`);
            return;
        }
        
        tracks.push({
            title,
            description,
            spotify_id: spotify_id || null,
            mp3File,
            language,
            category_id: categoryId,
            license,
            is_private: isPrivate
        });
        
        // Debug logging for each track
        console.log(`Track ${trackId} data:`, {
            title,
            is_private: isPrivate,
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
            const trackData = {
                title: track.title,
                description: track.description,
                language: track.language,
                category_id: track.category_id,
                spotify_id: track.spotify_id,
                mp3_url: mp3_url,
                license: track.license,
                is_private: track.is_private
            };
            
            // Generate token if private
            if (track.is_private) {
                // Use crypto.randomUUID() to generate a UUID
                trackData.private_token = crypto.randomUUID();
                console.log('Generated private_token:', trackData.private_token);
            }
                        
            const { data: insertedTrack, error: dbError } = await supabaseClient
                .from("tracks")
                .insert([trackData])
                .select()
                .single();

            if (dbError) {
                throw new Error(`Failed to save track "${track.title}": ${dbError.message}`);
            }
                        
            // Store track info if private (for showing links later)
            if (track.is_private && insertedTrack) {
                track.insertedTrack = insertedTrack;
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
    
    // Show private links if tracks were private
    if (isPrivate) {
        showPrivateTrackLinks(tracks);
    } else {
        alert(`Successfully uploaded ${totalTracks} track(s)!`);
        
        // Reset form
        setTimeout(() => {
            resetForm(form, progressContainer, progressBar, submitBtn);
        }, 2000);
    }
});

// Show private track links after upload
function showPrivateTrackLinks(tracks) {
    const privateTracks = tracks.filter(t => t.is_private && t.insertedTrack);
    
    if (privateTracks.length === 0) return;
    
    // Create modal with links and QR codes
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        overflow-y: auto;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 800px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
    `;
    
    let html = `
        <h2 style="margin-top: 0; color: #4f46e5;">🔒 Private Track Links</h2>
        <p style="color: #aaa; margin-bottom: 30px;">Save these links to share your private tracks. They won't appear in public listings.</p>
    `;
    
    privateTracks.forEach((track, index) => {
        const token = track.insertedTrack.private_token;
        // Get base URL (we're in /admin/ folder, so go up one level)
        const currentUrl = window.location.href;
        const adminIndex = currentUrl.lastIndexOf('/admin/');
        const baseUrl = currentUrl.substring(0, adminIndex + 1);
        const url = `${baseUrl}private-track.html?token=${token}`;
        const qrId = `qr-${index}`;
        
        html += `
            <div style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 2px solid #e9ecef;">
                <h3 style="margin-top: 0; color: #333;">${track.title}</h3>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <input type="text" value="${url}" readonly 
                        style="flex: 1; font-family: monospace; font-size: 12px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" 
                        id="link-${index}" />
                    <button onclick="copyLink('${url}', ${index})" class="button secondary" id="copy-btn-${index}">Copy</button>
                </div>
                <div style="text-align: center;">
                    <div id="${qrId}" style="display: inline-block; padding: 10px; background: white; border-radius: 8px;"></div>
                </div>
            </div>
        `;
    });
    
    html += `
        <button onclick="closePrivateLinksModal()" class="button primary" style="width: 100%; margin-top: 20px;">
            Done - Close and Reset Form
        </button>
    `;
    
    content.innerHTML = html;
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Generate QR codes
    privateTracks.forEach((track, index) => {
        const token = track.insertedTrack.private_token;
        // Get base URL (we're in /admin/ folder, so go up one level)
        const currentUrl = window.location.href;
        const adminIndex = currentUrl.lastIndexOf('/admin/');
        const baseUrl = currentUrl.substring(0, adminIndex + 1);
        const url = `${baseUrl}private-track.html?token=${token}`;
        const qrId = `qr-${index}`;
        
        new QRCode(document.getElementById(qrId), {
            text: url,
            width: 150,
            height: 150,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    });
    
    // Make functions global for onclick handlers
    window.copyLink = async (url, index) => {
        try {
            await navigator.clipboard.writeText(url);
            const btn = document.getElementById(`copy-btn-${index}`);
            btn.textContent = '✓ Copied!';
            btn.style.background = '#10b981';
            setTimeout(() => {
                btn.textContent = 'Copy';
                btn.style.background = '';
            }, 2000);
        } catch (err) {
            document.getElementById(`link-${index}`).select();
            document.execCommand('copy');
        }
    };
    
    window.closePrivateLinksModal = () => {
        document.body.removeChild(modal);
        const form = document.getElementById('multiTrackForm');
        const progressContainer = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('progressBarFill');
        const submitBtn = form.querySelector('button[type="submit"]');
        resetForm(form, progressContainer, progressBar, submitBtn);
    };
}

// Helper to reset form
function resetForm(form, progressContainer, progressBar, submitBtn) {
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
}

// Load categories using CategoryModel
async function loadCategories() {
    try {
        const categories = await categoryModel.getAll();
        
        const select = document.getElementById('categorySelect');
        
        // Clear existing options except first two (placeholder and "new category")
        while (select.options.length > 2) {
            select.remove(2);
        }
        
        // Add categories from database
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Create category using CategoryModel
async function createCategory(name) {
    try {
        const category = await categoryModel.create(name);
        return category;
    } catch (error) {
        console.error('Error creating category:', error);
        alert('Failed to create category: ' + error.message);
        return null;
    }
}

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
