const supabaseClient = supabase.createClient(
  "https://ongcmxiqyoeewcwmkndr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZ2NteGlxeW9lZXdjd21rbmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjA4MzQsImV4cCI6MjA5MTEzNjgzNH0.RI3G2N9iwmHb0BTAuboZIPFH1ngysQ2Rd9b3IHCSyWc"
);

// ==================== AUTHENTICATION ====================

// Helper function to get the correct path (works both locally and on GitHub Pages)
function getRelativePath(path) {
  // Get current directory
  const currentPath = window.location.pathname;
  const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
  
  // If we're in /admin/, go up one level
  if (currentDir.endsWith('/admin')) {
    return '..' + path;
  }
  
  // If we're already in root or login page
  return '.' + path;
}

// Check if user is authenticated (for protected pages)
async function requireAuth() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  
  if (!user) {
    // User is not logged in, redirect to login page
    window.location.href = getRelativePath('/login.html');
    return null;
  }
  
  return user;
}

// Sign out function
async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error);
    alert('Failed to sign out');
    return;
  }
  
  window.location.href = getRelativePath('/login.html');
}

// Get current user
async function getCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// Add logout button to protected pages
async function addLogoutButton() {
  const user = await getCurrentUser();
  
  if (!user) return;
  
  const nav = document.querySelector('.site-nav');
  
  if (nav && !document.getElementById('logoutBtn')) {
    const logoutBtn = document.createElement('a');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.href = '#';
    logoutBtn.textContent = 'Logga ut';
    logoutBtn.style.cursor = 'pointer';
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Är du säker på att du vill logga ut?')) {
        signOut();
      }
    });
    
    nav.appendChild(logoutBtn);
    
    // Also show user email
    const userInfo = document.createElement('span');
    userInfo.style.marginRight = '20px';
    userInfo.style.fontSize = '14px';
    userInfo.style.opacity = '0.8';
    userInfo.textContent = user.email;
    nav.insertBefore(userInfo, logoutBtn);
  }
}

// Protect admin pages - call this on admin pages
if (window.location.pathname.includes('/admin/')) {
  requireAuth().then(user => {
    if (user) {
      addLogoutButton();
    }
  });
}

// ==================== END AUTHENTICATION ====================

// Load categories when page loads
async function loadCategories() {
  const { data: categories, error } = await supabaseClient
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error loading categories:", error);
    return;
  }

  const select = document.getElementById("categorySelect");
  
  // Clear existing options except the first two (placeholder and "new category")
  while (select.options.length > 2) {
    select.remove(2);
  }

  // Add categories from database
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    select.appendChild(option);
  });
}

// Handle category selection
document.getElementById("categorySelect")?.addEventListener("change", (e) => {
  const newCategoryInput = document.getElementById("newCategoryInput");
  
  if (e.target.value === "__new__") {
    newCategoryInput.style.display = "flex";
    document.getElementById("newCategoryName").focus();
  } else {
    newCategoryInput.style.display = "none";
    document.getElementById("newCategoryName").value = "";
  }
});

// Cancel new category
document.getElementById("cancelNewCategory")?.addEventListener("click", () => {
  document.getElementById("categorySelect").value = "";
  document.getElementById("newCategoryInput").style.display = "none";
  document.getElementById("newCategoryName").value = "";
});

// Create new category
async function createCategory(name) {
  // First check if category already exists
  const slug = name.toLowerCase().replace(/\s+/g, '_');
  
  const { data: existing, error: checkError } = await supabaseClient
    .from("categories")
    .select("*")
    .or(`name.ilike.${name},slug.eq.${slug}`)
    .single();
  
  // If category already exists, return it instead of creating new
  if (existing) {
    console.log("Category already exists, using existing:", existing.name);
    return existing;
  }
  
  // Category doesn't exist, create it
  const { data, error } = await supabaseClient
    .from("categories")
    .insert([{ 
      name: name,
      slug: slug
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating category:", error);
    alert("Failed to create category: " + error.message);
    return null;
  }

  return data;
}

// Initialize categories on page load
if (document.getElementById("categorySelect")) {
  loadCategories();
}

// ==================== TAGS FUNCTIONALITY ====================

// Get or create tag by name
async function getOrCreateTag(tagName) {
  const normalizedName = tagName.trim().toLowerCase();
  
  if (!normalizedName) return null;
  
  // Check if tag exists (case-insensitive)
  const { data: existing, error: checkError } = await supabaseClient
    .from("tags")
    .select("*")
    .ilike("name", normalizedName)
    .single();
  
  if (existing) {
    return existing;
  }
  
  // Create new tag
  const { data, error } = await supabaseClient
    .from("tags")
    .insert([{ 
      name: normalizedName,
      color: '#3B82F6' // Default color
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating tag:", error);
    return null;
  }

  return data;
}

// Search tags by partial name
async function searchTags(searchTerm) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }
  
  const { data, error } = await supabaseClient
    .from("tags")
    .select("*")
    .ilike("name", `%${searchTerm.trim()}%`)
    .order("name")
    .limit(10);

  if (error) {
    console.error("Error searching tags:", error);
    return [];
  }

  return data || [];
}

// Add tags to track
async function addTagsToTrack(trackId, tagNames) {
  if (!tagNames || tagNames.length === 0) return true;
  
  // Get or create all tags
  const tagPromises = tagNames.map(name => getOrCreateTag(name));
  const tags = await Promise.all(tagPromises);
  
  // Filter out any nulls
  const validTags = tags.filter(tag => tag !== null);
  
  if (validTags.length === 0) return true;
  
  // Create track_tags relationships
  const trackTags = validTags.map(tag => ({
    track_id: trackId,
    tag_id: tag.id
  }));
  
  const { error } = await supabaseClient
    .from("track_tags")
    .insert(trackTags);

  if (error) {
    console.error("Error adding tags to track:", error);
    return false;
  }

  return true;
}

// Parse comma-separated tag string
function parseTagString(tagString) {
  if (!tagString || tagString.trim().length === 0) {
    return [];
  }
  
  return tagString
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0);
}

// ==================== END TAGS FUNCTIONALITY ====================

document.getElementById("trackForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const file = form.mp3.files[0];
  
  if (!file) {
    alert("Please select an MP3 file");
    return;
  }

  // Handle category - create new if needed
  let categoryId = form.category_id.value;
  
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

  if (!categoryId) {
    alert("Please select a category");
    return;
  }

  // Show loading state
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Uploading...";
  submitBtn.disabled = true;

  // 1. Upload file to Storage
  const fileName = `${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from("tracks")
    .upload(fileName, file);

  if (uploadError) {
    console.error("Upload error:", uploadError);
    alert("Failed to upload file: " + uploadError.message);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    return;
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
      title: form.title.value,
      description: form.description.value,
      language: form.language.value,
      category_id: categoryId,
      spotify_url: form.spotify_url.value || null,
      mp3_url: mp3_url,
      license: form.license.checked
    }])
    .select()
    .single();

  if (dbError) {
    console.error("Database error:", dbError);
    alert("Failed to save track: " + dbError.message);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    return;
  }

  // 4. Add tags if any
  const tagsInput = form.tags?.value;
  if (tagsInput && insertedTrack) {
    const tagNames = parseTagString(tagsInput);
    await addTagsToTrack(insertedTrack.id, tagNames);
  }

  alert("Track uploaded successfully!");
  
  // Reset form
  form.reset();
  document.getElementById("newCategoryInput").style.display = "none";
  
  // Reload categories to show the new one if created
  await loadCategories();
  
  submitBtn.textContent = originalText;
  submitBtn.disabled = false;
});