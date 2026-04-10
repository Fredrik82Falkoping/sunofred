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

// Add language selector to navigation
function addLanguageSelector() {
    const nav = document.querySelector('.site-nav');
    if (!nav || document.getElementById('languageSelector')) return;

    const currentLang = getCurrentLanguage();

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

    const languages = [
        { code: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'sv', label: 'Svenska', flag: '🇸🇪' }
    ];

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

// Filter query for current language
function addLanguageFilter(query) {
    const currentLang = getCurrentLanguage();
    return query.eq('language', currentLang);
}

// Get language label
function getLanguageLabel(code) {
    const labels = {
        'en': 'English',
        'sv': 'Swedish'
    };
    return labels[code] || code;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    addLanguageSelector();
});

// Export functions for use in other scripts
window.languageFilter = {
    getCurrentLanguage,
    setLanguage,
    addLanguageFilter,
    getLanguageLabel,
    addLanguageSelector
};
