import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import {
  DEFAULT_LOCALE,
  LOCALES,
  detectPreferredLocale,
  getCopy,
  pathFor,
} from "@/i18n";

const loadProduto = () => import("@/pages/Produto");
const loadGaleria = () => import("@/pages/Galeria");
const loadEngenharia = () => import("@/pages/Engenharia");
const loadContribuir = () => import("@/pages/Contribuir");
const loadFAQ = () => import("@/pages/FAQ");
const loadDownloads = () => import("@/pages/Downloads");
const loadNotFound = () => import("@/pages/NotFound");

const Produto = lazy(loadProduto);
const Galeria = lazy(loadGaleria);
const Engenharia = lazy(loadEngenharia);
const Contribuir = lazy(loadContribuir);
const FAQ = lazy(loadFAQ);
const Downloads = lazy(loadDownloads);
const NotFound = lazy(loadNotFound);

function stripLeadingSlash(value: string): string {
  return value.replace(/^\/+/, "");
}

const localizedRouteEntries = LOCALES.flatMap((locale) => [
  {
    key: `${locale}-home`,
    path: stripLeadingSlash(pathFor(locale, "home")),
    element: <Produto locale={locale} />,
  },
  {
    key: `${locale}-gallery`,
    path: stripLeadingSlash(pathFor(locale, "gallery")),
    element: <Galeria locale={locale} />,
  },
  {
    key: `${locale}-engineering`,
    path: stripLeadingSlash(pathFor(locale, "engineering")),
    element: <Engenharia locale={locale} />,
  },
  {
    key: `${locale}-contributing`,
    path: stripLeadingSlash(pathFor(locale, "contributing")),
    element: <Contribuir locale={locale} />,
  },
  {
    key: `${locale}-faq`,
    path: stripLeadingSlash(pathFor(locale, "faq")),
    element: <FAQ locale={locale} />,
  },
  {
    key: `${locale}-downloads`,
    path: stripLeadingSlash(pathFor(locale, "downloads")),
    element: <Downloads locale={locale} />,
  },
]);

const LocaleRedirect = () => {
  const navigate = useNavigate();
  const message = getCopy(DEFAULT_LOCALE).redirecting;

  useEffect(() => {
    const preferred =
      typeof window !== "undefined"
        ? detectPreferredLocale(window.navigator.languages)
        : DEFAULT_LOCALE;

    navigate(pathFor(preferred, "home"), { replace: true });
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 text-center text-sm text-muted-foreground">
      {message}
    </main>
  );
};

const RouteChunkWarmup = () => {
  useEffect(() => {
    const warm = () => {
      void Promise.allSettled([
        loadProduto(),
        loadGaleria(),
        loadEngenharia(),
        loadContribuir(),
        loadFAQ(),
        loadDownloads(),
        loadNotFound(),
      ]);
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warm, { timeout: 1800 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(warm, 700);
    return () => clearTimeout(timeoutId);
  }, []);

  return null;
};

const App = () => (
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <ScrollToTop />
    <RouteChunkWarmup />
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 text-center text-sm text-muted-foreground">
          Loading...
        </main>
      }
    >
      <Routes>
        <Route path="/" element={<LocaleRedirect />} />
        {localizedRouteEntries.map((entry) => (
          <Route key={entry.key} path={entry.path} element={entry.element} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
