import { Link } from "react-router";
import "@/aurora/aurora.css";
import { Locale, getCopy, pathFor } from "@/i18n";

interface HeroProps {
  locale: Locale;
}

/**
 * Abertura: identificacao direta. O titulo e a descricao ficam acima; a
 * aplicacao aparece no palco, logo abaixo — nunca espremida ao lado do titulo.
 */
const Hero = ({ locale }: HeroProps) => {
  const hero = getCopy(locale).pages.home.hero;

  return (
    <section
      id="topo"
      aria-labelledby="home-title"
      className="margins-paper relative overflow-hidden border-b border-rule bg-paper text-ink"
    >
      <div className="measure relative border-l border-terracotta/30 px-6 pb-14 pt-8 lg:px-10 lg:pb-20 lg:pt-12">
        <div className="label-mono flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-ink-soft">
          <span>{hero.label}</span>
          <span className="hidden sm:inline">{hero.facts[0][1]}</span>
        </div>

        <h1
          id="home-title"
          className="font-display-tight mt-10 text-[clamp(2.75rem,6.2vw,5.25rem)] lg:mt-14"
        >
          {hero.titleLines.map((line, index) => (
            <span key={line} className={`block ${index === hero.accentLine ? "text-terracotta" : ""}`}>
              {line}
            </span>
          ))}
        </h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="max-w-xl text-lg leading-snug text-ink md:text-xl">{hero.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={pathFor(locale, "downloads")}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper-2 transition-colors hover:bg-terracotta-deep"
              >
                {hero.primaryCta}
                <span aria-hidden="true">↓</span>
              </Link>
              <a
                href="#leituras"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 border border-ink px-5 text-sm font-semibold text-ink transition-colors hover:bg-paper-2"
              >
                {hero.secondaryCta}
              </a>
            </div>
          </div>

          <dl className="border-t border-rule text-sm lg:col-span-5">
            {hero.facts.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 border-b border-rule py-2">
                <dt className="label-mono pt-0.5 text-ink-soft">{key}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};

export default Hero;
