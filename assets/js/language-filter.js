// Language Filter System
// Handles language selection and filtering across the site

const STORAGE_KEY = 'sunofred_language';
const DEFAULT_LANGUAGE = 'en';

// Get current language from localStorage or default
function getCurrentLanguage() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
}

// Set language and reload page
function setLanguage(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
    // Dispatch event so other parts of the page can react
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
}

// Get available languages from database
async function getAvailableLanguages() {
    if (!window.supabaseClient) {
        console.warn('Supabase client not available yet');
        return null; // Return null to indicate we couldn't fetch
    }

    try {
        const { data, error } = await window.supabaseClient
            .from('tracks')
            .select('language')
            .eq('is_private', false); // Exclude private tracks

        if (error) {
            console.error('Error fetching languages:', error);
            return null;
        }

        // Get unique languages
        const uniqueLanguages = [...new Set(data.map(track => track.language))];
        // console.log('Available languages from DB:', uniqueLanguages);
        return uniqueLanguages.filter(Boolean).sort();
    } catch (err) {
        console.error('Error:', err);
        return null;
    }
}

// Add language selector to navigation
async function addLanguageSelector() {
    const nav = document.querySelector('.site-nav');
    if (!nav || document.getElementById('languageSelector')) return;

    const currentLang = getCurrentLanguage();
    
    // Get available languages from database
    const availableLanguages = await getAvailableLanguages();

    const selector = document.createElement('div');
    selector.id = 'languageSelector';
    selector.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
        margin-left: auto;
        padding-left: 20px;
        border-left: 1px solid rgba(255,255,255,0.2);
    `;

    const allLanguages = [
        { code: 'all', label: 'All Languages', flag: '🌐' },
        { code: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
        { code: 'de', label: 'Deutsch', flag: '🇩🇪' }
    ];

    // Filter to only show languages that have tracks (or "all")
    // If we couldn't get available languages, show all by default
    const languages = availableLanguages 
        ? allLanguages.filter(lang => lang.code === 'all' || availableLanguages.includes(lang.code))
        : allLanguages;

    // console.log('Showing languages:', languages.map(l => l.code));

    languages.forEach(({ code, label, flag }) => {
        const btn = document.createElement('button');
        btn.className = 'language-btn';
        btn.dataset.lang = code;
        btn.innerHTML = `${flag} <span>${label}</span>`;
        btn.title = label;
        
        btn.style.cssText = `
            background: ${currentLang === code ? 'rgba(255,255,255,0.2)' : 'transparent'};
            border: 1px solid ${currentLang === code ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'};
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        `;

        btn.addEventListener('mouseenter', () => {
            if (currentLang !== code) {
                btn.style.background = 'rgba(255,255,255,0.1)';
                btn.style.borderColor = 'rgba(255,255,255,0.3)';
            }
        });

        btn.addEventListener('mouseleave', () => {
            if (currentLang !== code) {
                btn.style.background = 'transparent';
                btn.style.borderColor = 'rgba(255,255,255,0.2)';
            }
        });

        btn.addEventListener('click', () => {
            setLanguage(code);
            window.location.reload();
        });

        selector.appendChild(btn);
    });

    nav.appendChild(selector);
}

// Update which language buttons are visible based on available languages
function updateAvailableLanguages(availableLanguages) {
    const selector = document.getElementById('languageSelector');
    if (!selector) return;

    const currentLang = getCurrentLanguage();
    
    const allLanguages = [
        { code: 'all', label: 'All Languages', flag: '🌐' },
        { code: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
        { code: 'de', label: 'Deutsch', flag: '🇩🇪' }
    ];

    // Filter to only show languages that are available (or "all")
    const languages = allLanguages.filter(lang => 
        lang.code === 'all' || availableLanguages.includes(lang.code)
    );

    // Clear and rebuild the selector
    selector.innerHTML = '';

    languages.forEach(({ code, label, flag }) => {
        const btn = document.createElement('button');
        btn.className = 'language-btn';
        btn.dataset.lang = code;
        btn.innerHTML = `${flag} <span>${label}</span>`;
        btn.title = label;
        
        btn.style.cssText = `
            background: ${currentLang === code ? 'rgba(255,255,255,0.2)' : 'transparent'};
            border: 1px solid ${currentLang === code ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'};
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        `;

        btn.addEventListener('mouseenter', () => {
            if (currentLang !== code) {
                btn.style.background = 'rgba(255,255,255,0.1)';
                btn.style.borderColor = 'rgba(255,255,255,0.3)';
            }
        });

        btn.addEventListener('mouseleave', () => {
            if (currentLang !== code) {
                btn.style.background = 'transparent';
                btn.style.borderColor = 'rgba(255,255,255,0.2)';
            }
        });

        btn.addEventListener('click', () => {
            setLanguage(code);
            window.location.reload();
        });

        selector.appendChild(btn);
    });
}

// Filter query for current language
function addLanguageFilter(query) {
    const currentLang = getCurrentLanguage();
    return query.eq('language', currentLang);
}

// Get language label
function getLanguageLabel(code) {
    const labels = {
        'en': 'English',
        'sv': 'Swedish',
        'de': 'German',
        'all': 'All Languages'
    };
    return labels[code] || code;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for Supabase client to be loaded
    let attempts = 0;
    const maxAttempts = 10; // Max 1 second
    
    const initLanguageSelector = () => {
        attempts++;
        // console.log(`Attempt ${attempts}: Supabase client available?`, !!window.supabaseClient);
        
        if (window.supabaseClient) {
            // console.log('Supabase client found, initializing language selector');
            addLanguageSelector();
        } else if (attempts < maxAttempts) {
            // Retry after a short delay
            setTimeout(initLanguageSelector, 100);
        } else {
            console.error('Failed to initialize language selector: Supabase client not available after', maxAttempts, 'attempts');
            // Show selector anyway without filtering
            addLanguageSelector();
        }
    };
    initLanguageSelector();
});

// Export functions for use in other scripts
window.languageFilter = {
    getCurrentLanguage,
    setLanguage,
    addLanguageFilter,
    getLanguageLabel,
    addLanguageSelector,
    getAvailableLanguages,
    updateAvailableLanguages
};
