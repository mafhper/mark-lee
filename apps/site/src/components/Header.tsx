import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo-light.svg";
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
    editor: copy.nav.editor,
    memorias: copy.nav.memories,
    local: copy.nav.localFirst,
  } as const;

  const closeMobileMenu = () => {
    setMobileState({ locationKey: location.key, open: false });
  };

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link
          to={pathFor(locale, "home")}
          onClick={closeMobileMenu}
          className="site-brand"
          aria-label="Mark-Lee"
        >
          <img src={logo} alt="" className="site-brand__mark" />
          <span>Mark-Lee</span>
        </Link>

        <nav className="site-nav" aria-label={copy.nav.primaryAriaLabel}>
          {PRIMARY_HOME_SECTIONS.map((section) => (
            <Link key={section} to={homeSectionPath(locale, section)} className="site-nav__link">
              {sectionLabels[section]}
            </Link>
          ))}
        </nav>

        <div className="site-header__actions">
          <Link to={pathFor(locale, "downloads")} className="site-button site-button--small">
            {copy.downloadLabel}
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="site-header__github"
          >
            {copy.githubLabel}
          </a>
        </div>

        <button
          type="button"
          className="site-menu-button"
          onClick={() =>
            setMobileState({ locationKey: location.key, open: !mobileOpen })
          }
          aria-expanded={mobileOpen}
          aria-controls="mobile-main-nav"
          aria-label={mobileOpen ? copy.closeMenuAria : copy.openMenuAria}
        >
          {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {mobileOpen && (
        <div id="mobile-main-nav" className="site-mobile-nav">
          <nav className="container site-mobile-nav__inner" aria-label={copy.nav.mobileAriaLabel}>
            {PRIMARY_HOME_SECTIONS.map((section) => (
              <Link
                key={section}
                to={homeSectionPath(locale, section)}
                onClick={closeMobileMenu}
                className="site-mobile-nav__link"
              >
                {sectionLabels[section]}
              </Link>
            ))}
            <Link
              to={pathFor(locale, "downloads")}
              onClick={closeMobileMenu}
              className="site-button site-mobile-nav__download"
            >
              {copy.downloadLabel}
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="site-mobile-nav__link"
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
