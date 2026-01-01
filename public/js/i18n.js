// public/js/i18n.js

(function() {
  const defaultLang = 'pt-BR';
  let translations = {};

  // Helper to get query parameter
  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  // Helper to set query parameter without reloading
  function setQueryParam(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.pushState({}, '', url);
  }

  // Load translations JSON file
  async function loadTranslations(lang) {
    try {
      const response = await fetch(`locales/${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load translations for ${lang}`);
      }
      translations = await response.json();
      applyTranslations();
    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback to default language if loading fails
      if (lang !== defaultLang) {
        loadTranslations(defaultLang);
      }
    }
  }

  // Apply translations to the DOM
  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (translations[key]) {
        element.textContent = translations[key];
      }
    });

    document.querySelectorAll('[data-i18n-html]').forEach(element => {
      const key = element.getAttribute('data-i18n-html');
      if (translations[key]) {
        element.innerHTML = translations[key]; // Use innerHTML for rich text
      }
    });

    document.querySelectorAll('[data-i18n-meta]').forEach(element => {
        const key = element.getAttribute('data-i18n-meta');
        if (translations[key]) {
            element.setAttribute('content', translations[key]); // Update content for meta tags
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      if (translations[key]) {
        element.placeholder = translations[key];
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      if (translations[key]) {
        element.title = translations[key];
      }
    });
    
    // Update HTML lang attribute
    document.documentElement.lang = getQueryParam('lang') || defaultLang;

    // Update page title
    const titleElement = document.querySelector('title');
    if (titleElement && titleElement.hasAttribute('data-i18n')) {
        titleElement.textContent = translations[titleElement.getAttribute('data-i18n')] || titleElement.textContent;
    }
  }

  // Language switcher event handler
  function handleLanguageChange(event) {
    const newLang = event.target.dataset.lang;
    if (newLang) {
      setQueryParam('lang', newLang);
      loadTranslations(newLang);

      // Update active state of language switcher buttons
      document.querySelectorAll('.lang-switcher-btn').forEach(button => {
        if (button.dataset.lang === newLang) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      });
    }
  }

  // Initialize i18n
  document.addEventListener('DOMContentLoaded', () => {
    const userLang = getQueryParam('lang') || navigator.language; // Use full navigator.language
    const availableLangs = ['pt-BR', 'en-US', 'es-ES', 'fr-FR', 'it-IT', 'zh-CN', 'ja-JP']; // All supported languages
    
    let langToLoad = defaultLang;
    // Check for exact match first
    if (availableLangs.includes(userLang)) {
        langToLoad = userLang;
    } else {
        // Check for base language match (e.g., 'pt' -> 'pt-BR')
        const baseLang = userLang.split('-')[0].toLowerCase();
        const foundLang = availableLangs.find(lang => lang.startsWith(baseLang));
        if (foundLang) {
            langToLoad = foundLang;
        }
    }
    
    // Ensure the language switcher has the correct initial active state
    document.querySelectorAll('.lang-switcher-btn').forEach(button => {
        if (button.dataset.lang === langToLoad) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    loadTranslations(langToLoad);

    // Attach event listeners to language switcher buttons
    document.querySelectorAll('.lang-switcher-btn').forEach(button => {
      button.addEventListener('click', handleLanguageChange);
    });
  });

})();