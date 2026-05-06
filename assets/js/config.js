// Configuration file for Supabase
// Note: In production, use environment variables with a build tool
// For now, this file should NOT be committed to git

// For local development, you can manually copy values from .env
// Or use a build tool like Vite that supports import.meta.env

const config = {
  supabase: {
    url: 'https://ongcmxiqyoeewcwmkndr.supabase.co',
    // Use anon key for client-side, NOT service role key
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZ2NteGlxeW9lZXdjd21rbmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjA4MzQsImV4cCI6MjA5MTEzNjgzNH0.RI3G2N9iwmHb0BTAuboZIPFH1ngysQ2Rd9b3IHCSyWc'
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
