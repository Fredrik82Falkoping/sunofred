const supabaseClient = supabase.createClient(
  "https://ongcmxiqyoeewcwmkndr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZ2NteGlxeW9lZXdjd21rbmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjA4MzQsImV4cCI6MjA5MTEzNjgzNH0.RI3G2N9iwmHb0BTAuboZIPFH1ngysQ2Rd9b3IHCSyWc"
);

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
  const { error: dbError } = await supabaseClient
    .from("tracks")
    .insert([{
      title: form.title.value,
      description: form.description.value,
      language: form.language.value,
      category_id: categoryId,
      spotify_url: form.spotify_url.value || null,
      mp3_url: mp3_url,
      license: form.license.checked
    }]);

  if (dbError) {
    console.error("Database error:", dbError);
    alert("Failed to save track: " + dbError.message);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    return;
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