// Configuration file for Supabase - EXAMPLE
// Copy this file to config.js and add your actual keys

const config = {
  supabase: {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
  }
};

// Initialize Supabase client
const supabaseClient = supabase.createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Export to window
window.supabaseClient = supabaseClient;
window.config = config;
