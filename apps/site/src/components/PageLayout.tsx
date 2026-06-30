import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getPageMeta, Locale, pageFromPathname } from "@/i18n";

const skipLabels: Record<Locale, string> = {
  "pt-BR": "Ir para o conteúdo principal",
  "en-US": "Skip to main content",
  "es-ES": "Ir al contenido principal",
};

interface PageLayoutProps {
  children: ReactNode;
  locale: Locale;
}

const PageLayout = ({ children, locale }: PageLayoutProps) => {
  const location = useLocation();

  useEffect(() => {
    const page = pageFromPathname(location.pathname) ?? "home";
    const meta = getPageMeta(locale, page);
    document.documentElement.lang = locale;
    document.title = meta.title;
    setMetaContent("name", "description", meta.description);
    setMetaContent("property", "og:title", meta.title);
    setMetaContent("property", "og:description", meta.description);
    setMetaContent("property", "og:locale", locale.replace("-", "_"));
  }, [locale, location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a className="skip-link" href="#main-content">
        {skipLabels[locale]}
      </a>
      <Header />
      <main id="main-content" className="flex-1 pt-14" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

function setMetaContent(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export default PageLayout;
