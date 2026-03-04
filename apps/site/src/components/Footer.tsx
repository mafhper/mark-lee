import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo-light.svg";
import { DEFAULT_LOCALE, getCopy, localeFromPathname, pathFor } from "@/i18n";

const Footer = () => {
  const location = useLocation();
  const locale = localeFromPathname(location.pathname) ?? DEFAULT_LOCALE;
  const copy = getCopy(locale);

  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="container py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          <div className="col-span-2">
            <Link
              to={pathFor(locale, "home")}
              className="mb-4 inline-flex items-end gap-2.5 rounded-md py-1 focus-visible:outline-none"
            >
              <img src={logo} alt="Mark-Lee" className="h-7 w-7 rounded-md" />
              <span className="text-base font-semibold leading-none text-foreground">Mark-Lee</span>
            </Link>
            <p className="max-w-[240px] text-sm leading-relaxed text-muted-foreground">
              {copy.footer.description}
            </p>
            <p className="mt-6 text-xs text-muted-foreground/60">{copy.footer.copyright}</p>
          </div>

          {copy.footer.groups.map((group) => (
            <div key={group.title}>
              <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.title}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.external && link.href ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={pathFor(locale, link.page ?? "home")}
                        className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
