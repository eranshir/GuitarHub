class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.availableLanguages = ['en', 'he'];
        this.init();
    }

    async init() {
        // Load saved language preference or default to English
        const savedLang = localStorage.getItem('guitarHubLanguage') || 'en';
        await this.loadLanguage(savedLang);
    }

    async loadLanguage(lang) {
        if (!this.availableLanguages.includes(lang)) {
            console.warn(`Language ${lang} not available, defaulting to English`);
            lang = 'en';
        }

        try {
            const response = await fetch(`js/locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load language file: ${lang}.json`);
            }
            this.translations = await response.json();
            this.currentLanguage = lang;
            localStorage.setItem('guitarHubLanguage', lang);

            // Update HTML lang attribute
            document.documentElement.lang = lang;

            // Set RTL for Hebrew
            if (lang === 'he') {
                document.documentElement.dir = 'rtl';
                document.body.classList.add('rtl');
            } else {
                document.documentElement.dir = 'ltr';
                document.body.classList.remove('rtl');
            }

            // Update all text in the DOM
            this.updateDOM();

            // Trigger custom event for other parts of the app
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        } catch (error) {
            console.error('Error loading language:', error);
        }
    }

    t(key, params = {}) {
        // Navigate through nested keys (e.g., "game.start")
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }

        // Replace parameters in the translation string
        if (typeof value === 'string') {
            return value.replace(/\{(\w+)\}/g, (match, param) => {
                return params[param] !== undefined ? params[param] : match;
            });
        }

        return value || key;
    }

    updateDOM() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);

            // Update element content based on type
            if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'number')) {
                element.placeholder = translation;
            } else if (element.tagName === 'INPUT' && element.type === 'button') {
                element.value = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update all elements with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Update all elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getAvailableLanguages() {
        return this.availableLanguages;
    }

    switchLanguage(lang) {
        return this.loadLanguage(lang);
    }
}

// Create global instance
window.i18n = new I18n();
