(function () {
  const SUPPORTED_LANGS = ["pt-BR", "en-US", "es-ES"];
  const DEFAULT_LANG = "en-US";
  let translations = {};

  function normalizeLang(lang) {
    if (!lang) return DEFAULT_LANG;
    const lower = lang.toLowerCase();
    if (lower.startsWith("pt")) return "pt-BR";
    if (lower.startsWith("es")) return "es-ES";
    if (lower.startsWith("en")) return "en-US";
    return DEFAULT_LANG;
  }

  function resolveScriptBaseUrl() {
    const script =
      document.currentScript ||
      document.querySelector('script[src$="/js/i18n.js"], script[src$="js/i18n.js"], script[src$="../js/i18n.js"]');

    if (script instanceof HTMLScriptElement && script.src) {
      return new URL(".", script.src);
    }

    return new URL(".", window.location.href);
  }

  function localeUrlFor(lang) {
    const scriptBase = resolveScriptBaseUrl();
    return new URL(`../locales/${lang}.json`, scriptBase);
  }

  function translate(key, fallback) {
    return translations[key] ?? fallback;
  }

  function applyTranslations(lang) {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (!key) return;
      element.textContent = translate(key, element.textContent || "");
    });

    document.querySelectorAll("[data-i18n-html]").forEach((element) => {
      const key = element.getAttribute("data-i18n-html");
      if (!key) return;
      element.innerHTML = translate(key, element.innerHTML || "");
    });

    document.querySelectorAll("[data-i18n-meta]").forEach((element) => {
      const key = element.getAttribute("data-i18n-meta");
      if (!key) return;
      element.setAttribute("content", translate(key, element.getAttribute("content") || ""));
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.getAttribute("data-i18n-placeholder");
      if (!key) return;
      element.setAttribute("placeholder", translate(key, element.getAttribute("placeholder") || ""));
    });

    const title = document.querySelector("title[data-i18n]");
    if (title) {
      const key = title.getAttribute("data-i18n");
      if (key) title.textContent = translate(key, title.textContent || "");
    }

    document.documentElement.lang = lang;
  }

  async function loadTranslations(lang) {
    try {
      const response = await fetch(localeUrlFor(lang));
      if (!response.ok) {
        throw new Error(`locale load failed: ${response.status}`);
      }

      translations = await response.json();
      applyTranslations(lang);
    } catch (error) {
      if (lang !== DEFAULT_LANG) {
        await loadTranslations(DEFAULT_LANG);
      } else {
        console.error("Translation loading error:", error);
      }
    }
  }

  function resolveInitialLanguage() {
    if (Array.isArray(navigator.languages)) {
      for (const candidate of navigator.languages) {
        const normalized = normalizeLang(candidate);
        if (SUPPORTED_LANGS.includes(normalized)) return normalized;
      }
    }

    return normalizeLang(navigator.language);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const lang = resolveInitialLanguage();
    loadTranslations(lang);
  });
})();
