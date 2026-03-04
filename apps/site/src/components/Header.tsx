import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo-light.svg";
import {
  DEFAULT_LOCALE,
  NAV_PAGE_ORDER,
  getCopy,
  localeFromPathname,
  pageFromPathname,
  pathFor,
} from "@/i18n";

const Header = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const locale = useMemo(
    () => localeFromPathname(location.pathname) ?? DEFAULT_LOCALE,
    [location.pathname]
  );
  const activePage = useMemo(
    () => pageFromPathname(location.pathname) ?? "home",
    [location.pathname]
  );
  const copy = getCopy(locale);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/85 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between gap-3">
        <Link
          to={pathFor(locale, "home")}
          className="flex items-end gap-2.5 rounded-md px-1.5 py-1 focus-visible:outline-none"
        >
          <img src={logo} alt="Mark-Lee" className="h-7 w-7 rounded-md" />
          <span className="text-sm font-semibold leading-none tracking-tight text-foreground">Mark-Lee</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_PAGE_ORDER.map((pageKey) => {
            const target = pathFor(locale, pageKey);
            const isActive = activePage === pageKey;
            return (
              <Link
                key={pageKey}
                to={target}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {copy.nav[pageKey]}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to={pathFor(locale, "downloads")}
            className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none"
          >
            {copy.downloadLabel}
          </Link>
          <a
            href="https://github.com/mafhper/mark-lee"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-2 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
          >
            {copy.githubLabel}
          </a>
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none md:hidden"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-main-nav"
          aria-label={mobileOpen ? copy.closeMenuAria : copy.openMenuAria}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div
          id="mobile-main-nav"
          className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden"
        >
          <nav className="container flex flex-col gap-1 py-4" aria-label="Mobile">
            {NAV_PAGE_ORDER.map((pageKey) => {
              const isActive = activePage === pageKey;
              return (
                <Link
                  key={pageKey}
                  to={pathFor(locale, pageKey)}
                  className={`rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none ${
                    isActive ? "bg-secondary text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {copy.nav[pageKey]}
                </Link>
              );
            })}
            <Link
              to={pathFor(locale, "downloads")}
              className="mt-2 rounded-full bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground focus-visible:outline-none"
            >
              {copy.downloadLabel}
            </Link>
            <a
              href="https://github.com/mafhper/mark-lee"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 rounded-md px-3 py-2 text-sm text-muted-foreground focus-visible:outline-none"
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
