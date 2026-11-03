import { useState } from "react";
import SectionHead from "@/aurora/SectionHead";
import { Locale, getCopy } from "@/i18n";

type ThemeId = "midnight" | "sepia" | "forest" | "nord";

/** Quatro amostras aproximadas, derivadas dos tokens de tema do aplicativo. */
const THEMES: Array<{ id: ThemeId; name: string; vars: Record<string, string> }> = [
  {
    id: "midnight",
    name: "Midnight",
    vars: {
      "--sample-bg": "oklch(0.188 0.013 248.5)",
      "--sample-surface": "oklch(0.225 0.016 250)",
      "--sample-fg": "oklch(0.857 0.014 248)",
      "--sample-muted": "oklch(0.62 0.02 250)",
      "--sample-accent": "oklch(0.72 0.11 245)",
      "--sample-rule": "oklch(0.3 0.018 250)",
    },
  },
  {
    id: "sepia",
    name: "Sepia",
    vars: {
      "--sample-bg": "oklch(0.944 0.028 88.8)",
      "--sample-surface": "oklch(0.915 0.034 85)",
      "--sample-fg": "oklch(0.34 0.04 58.7)",
      "--sample-muted": "oklch(0.52 0.04 60)",
      "--sample-accent": "oklch(0.55 0.11 45)",
      "--sample-rule": "oklch(0.84 0.035 80)",
    },
  },
  {
    id: "forest",
    name: "Forest",
    vars: {
      "--sample-bg": "oklch(0.27 0.023 157.4)",
      "--sample-surface": "oklch(0.31 0.026 156)",
      "--sample-fg": "oklch(0.894 0.023 141.2)",
      "--sample-muted": "oklch(0.68 0.03 145)",
      "--sample-accent": "oklch(0.754 0.102 138.1)",
      "--sample-rule": "oklch(0.38 0.026 155)",
    },
  },
  {
    id: "nord",
    name: "Nord",
    vars: {
      "--sample-bg": "oklch(0.324 0.023 264.2)",
      "--sample-surface": "oklch(0.37 0.026 264)",
      "--sample-fg": "oklch(0.899 0.016 262.7)",
      "--sample-muted": "oklch(0.7 0.025 262)",
      "--sample-accent": "oklch(0.775 0.062 217.5)",
      "--sample-rule": "oklch(0.43 0.026 264)",
    },
  },
];

interface ThemesProps {
  locale: Locale;
}

const Themes = ({ locale }: ThemesProps) => {
  const themes = getCopy(locale).pages.home.themes;
  const [selected, setSelected] = useState<ThemeId>("midnight");
  const active = THEMES.find((theme) => theme.id === selected) ?? THEMES[0];

  return (
    <section id="temas" aria-labelledby="temas-titulo" className="scroll-mt-14 border-b border-rule bg-paper text-ink">
      <div className="measure grid gap-12 border-l border-terracotta/30 px-6 py-20 lg:grid-cols-12 lg:px-10 lg:py-28">
        <div className="lg:col-span-4">
          <SectionHead id="temas" index={themes.index} label={themes.label} title={themes.title} />
          <p className="mt-6 max-w-sm text-ink-soft">{themes.text}</p>
        </div>

        <div className="lg:col-span-8">
          <div role="radiogroup" aria-label={themes.label} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {THEMES.map((theme) => {
              const activeOption = theme.id === selected;
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={activeOption}
                  onClick={() => setSelected(theme.id)}
                  className={`min-h-[44px] border px-3 py-3 text-left text-sm font-semibold transition-colors ${
                    activeOption
                      ? "border-ink bg-ink text-paper-2"
                      : "border-rule text-ink hover:border-ink hover:bg-paper-2"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="mb-2 flex gap-1"
                    style={{ ...(theme.vars as Record<string, string>) }}
                  >
                    {["--sample-bg", "--sample-fg", "--sample-accent"].map((token) => (
                      <span
                        key={token}
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: `var(${token})` }}
                      />
                    ))}
                  </span>
                  {theme.name}
                </button>
              );
            })}
          </div>

          <figure
            className="mt-6 border"
            style={{
              ...(active.vars as Record<string, string>),
              backgroundColor: "var(--sample-bg)",
              borderColor: "var(--sample-rule)",
            }}
          >
            <figcaption className="label-mono border-b px-5 py-3" style={{ borderColor: "var(--sample-rule)", color: "var(--sample-muted)" }}>
              {themes.sampleLabel} · {active.name}
            </figcaption>
            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <p className="font-heading text-2xl" style={{ color: "var(--sample-fg)" }}>
                {themes.previewTitle}
              </p>
              <p className="mt-3 max-w-xl text-base leading-relaxed" style={{ color: "var(--sample-fg)" }}>
                {themes.previewText}
              </p>
            </div>
          </figure>

          <p className="mt-3 font-mono text-[0.6875rem] text-ink-soft">{themes.note}</p>
        </div>
      </div>
    </section>
  );
};

export default Themes;
