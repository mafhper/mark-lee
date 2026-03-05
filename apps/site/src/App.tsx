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

const Produto = lazy(() => import("@/pages/Produto"));
const Galeria = lazy(() => import("@/pages/Galeria"));
const Engenharia = lazy(() => import("@/pages/Engenharia"));
const Contribuir = lazy(() => import("@/pages/Contribuir"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const Downloads = lazy(() => import("@/pages/Downloads"));
const NotFound = lazy(() => import("@/pages/NotFound"));

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

const App = () => (
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <ScrollToTop />
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
