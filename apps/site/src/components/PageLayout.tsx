import { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Locale } from "@/i18n";

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

export default PageLayout;
