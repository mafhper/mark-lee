import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import Wordmark from "@/aurora/Wordmark";
import "@/aurora/aurora.css";
import {
  DEFAULT_LOCALE,
  PRIMARY_HOME_SECTIONS,
  REPO_URL,
  getCopy,
  homeSectionPath,
  localeFromPathname,
  pathFor,
} from "@/i18n";

const Header = () => {
  const location = useLocation();
  const [mobileState, setMobileState] = useState({ locationKey: location.key, open: false });
  const locale = useMemo(
    () => localeFromPathname(location.pathname) ?? DEFAULT_LOCALE,
    [location.pathname]
  );
  const copy = getCopy(locale);
  const mobileOpen = mobileState.locationKey === location.key && mobileState.open;
  const sectionLabels = {
    leituras: copy.nav.product,
    arquivo: copy.nav.files,
    temas: copy.nav.customization,
  } as const;

  const closeMobileMenu = () => {
    setMobileState({ locationKey: location.key, open: false });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-[80] h-14 border-b border-rule bg-paper/95 text-ink backdrop-blur-[14px]">
      <div className="measure flex h-14 items-center gap-5 px-6 lg:px-10">
        <Link
          to={pathFor(locale, "home")}
          onClick={closeMobileMenu}
          className="inline-flex items-center gap-2.5 text-[0.95rem] font-bold tracking-[-0.03em] text-ink"
          aria-label="Mark-Lee"
        >
          <Wordmark withMark />
        </Link>

        <nav aria-label={copy.nav.primaryAriaLabel} className="hidden items-center gap-1 lg:flex">
          {PRIMARY_HOME_SECTIONS.map((section) => (
            <Link
              key={section}
              to={homeSectionPath(locale, section)}
              className="px-2.5 py-2 text-[0.78rem] font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              {sectionLabels[section]}
            </Link>
          ))}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-2 text-[0.78rem] font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            {copy.pages.home.download.source}
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to={pathFor(locale, "downloads")}
            className="inline-flex min-h-[34px] items-center justify-center bg-ink px-3.5 text-[0.76rem] font-semibold text-paper-2 transition-colors hover:bg-terracotta-deep"
          >
            {copy.downloadLabel}
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center text-ink lg:hidden"
          onClick={() => setMobileState({ locationKey: location.key, open: !mobileOpen })}
          aria-expanded={mobileOpen}
          aria-controls="mobile-main-nav"
          aria-label={mobileOpen ? copy.closeMenuAria : copy.openMenuAria}
        >
          {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {mobileOpen && (
        <div id="mobile-main-nav" className="border-b border-rule bg-paper-2">
          <nav aria-label={copy.nav.mobileAriaLabel} className="measure grid gap-1 px-6 pb-4 pt-3">
            {PRIMARY_HOME_SECTIONS.map((section) => (
              <Link
                key={section}
                to={homeSectionPath(locale, section)}
                onClick={closeMobileMenu}
                className="flex min-h-[44px] items-center px-2.5 text-[0.9rem] font-semibold text-ink-soft hover:text-ink"
              >
                {sectionLabels[section]}
              </Link>
            ))}
            <Link
              to={pathFor(locale, "downloads")}
              onClick={closeMobileMenu}
              className="mt-1 flex min-h-[44px] items-center justify-center bg-ink px-3.5 text-sm font-semibold text-paper-2"
            >
              {copy.downloadLabel}
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center px-2.5 text-[0.9rem] font-semibold text-ink-soft hover:text-ink"
            >
              {copy.githubLabel}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
