import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  DEFAULT_LOCALE,
  getCopy,
  localeFromPathname,
  pathFor,
} from "@/i18n";

const NotFound = () => {
  const location = useLocation();

  const locale = useMemo(
    () => localeFromPathname(location.pathname) ?? DEFAULT_LOCALE,
    [location.pathname]
  );

  const copy = getCopy(locale).notFound;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 pt-14">
      <section className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-2 text-xl text-foreground">{copy.title}</p>
        <p className="mb-5 text-sm text-muted-foreground">{copy.description}</p>
        <Link
          to={pathFor(locale, "home")}
          className="rounded-md text-primary underline underline-offset-4 transition-colors hover:text-primary/90 focus-visible:outline-none"
        >
          {copy.cta}
        </Link>
      </section>
    </main>
  );
};

export default NotFound;
