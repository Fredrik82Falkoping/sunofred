/**
 * ViewLoader - Handles loading HTML views from separate files
 */

class ViewLoader {
    constructor() {
        this.viewCache = new Map();
        this.viewsPath = 'assets/views/';
    }

    /**
     * Load a view from an HTML file
     * @param {string} viewName - Name of the view file (without .html)
     * @returns {Promise<string>} HTML content
     */
    async load(viewName) {
        // Check cache first
        if (this.viewCache.has(viewName)) {
            return this.viewCache.get(viewName);
        }

        try {
            const response = await fetch(`${this.viewsPath}${viewName}.html`);
            
            if (!response.ok) {
                throw new Error(`Failed to load view: ${viewName}`);
            }

            const html = await response.text();
            
            // Cache the view
            this.viewCache.set(viewName, html);
            
            return html;
        } catch (error) {
            console.error(`Error loading view ${viewName}:`, error);
            return '<div class="error">Failed to load view</div>';
        }
    }

    /**
     * Clear the view cache (useful for development)
     */
    clearCache() {
        this.viewCache.clear();
    }

    /**
     * Load and inject SVG icon
     * @param {string} iconName - Name of the icon file (without .svg)
     * @returns {Promise<string>} SVG content
     */
    async loadIcon(iconName) {
        try {
            const response = await fetch(`assets/images/icons/${iconName}.svg`);
            
            if (!response.ok) {
                console.warn(`Icon not found: ${iconName}`);
                return '';
            }

            return await response.text();
        } catch (error) {
            console.error(`Error loading icon ${iconName}:`, error);
            return '';
        }
    }
}

// Initialize global view loader
window.viewLoader = new ViewLoader();
