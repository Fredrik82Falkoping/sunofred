/**
 * App.js - Main application initialization
 * Ties together player, router, and other global components
 */

// Wait for DOM and Supabase to be ready
document.addEventListener('DOMContentLoaded', async () => {
    // console.log('Sun of Red SPA initialized');
    
    // Check if supabase is loaded
    if (typeof supabaseClient === 'undefined') {
        console.error('Supabase client not initialized');
        return;
    }

    // Load all icons
    await loadAllIcons();

    // Global error handler
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
    });
});

// Load all SVG icons from separate files
async function loadAllIcons() {
    const iconContainers = document.querySelectorAll('.icon-container[data-icon]');
    const viewLoader = new ViewLoader();
    
    for (const container of iconContainers) {
        const iconName = container.getAttribute('data-icon');
        try {
            const svgContent = await viewLoader.loadIcon(iconName);
            container.innerHTML = svgContent;
        } catch (error) {
            console.error(`Failed to load icon: ${iconName}`, error);
        }
    }
}

// Utility function to check if user is authenticated
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return !!session;
}

// Make checkAuth available globally
window.checkAuth = checkAuth;
