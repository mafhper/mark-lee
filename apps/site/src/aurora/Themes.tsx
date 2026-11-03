import { useState } from "react";
import SectionHead from "@/aurora/SectionHead";
import { RECORD } from "@/aurora/demo";
import { formatRecordDate } from "@/aurora/record-format";
import { ORDERED_THEMES, RecordTheme, fadeToken } from "@/aurora/theme-tokens";
import { Locale, SiteCopy, getCopy } from "@/i18n";

type StageChrome = SiteCopy["pages"]["home"]["stage"]["chrome"];

/**
 * A previa e o registro de demonstracao renderizado com os tokens do tema
 * escolhido — o mesmo conteudo em todos, so as sete cores mudam. A altura e
 * fixa e o painel nao rola: trocar de tema nao mexe em nada na pagina.
 */
const ThemePreview = ({ theme, locale, chrome }: { theme: RecordTheme; locale: Locale; chrome: StageChrome }) => {
  const mutedChrome = fadeToken(theme.fgHex, theme.uiHex, 62);
  const mutedBody = fadeToken(theme.fgHex, theme.bgHex, 78);

  return (
    <div data-preview="" className="border" style={{ borderColor: theme.uiBorderHex }}>
      <div
        className="flex items-center gap-2 border-b px-3 py-1.5"
        style={{ backgroundColor: theme.uiHex, borderColor: theme.uiBorderHex, color: theme.fgHex }}
      >
        <span
          aria-hidden="true"
          className="grid h-[1.1rem] w-[1.1rem] place-items-center rounded-[2px] text-[0.55rem] font-semibold"
          style={{ backgroundColor: theme.fgHex, color: theme.uiHex }}
        >
          M
        </span>
        <span className="text-[0.75rem] font-semibold">Mark-Lee</span>
        <span className="ml-auto font-mono text-[0.64rem]" style={{ color: mutedChrome }}>
          {formatRecordDate(locale, RECORD.date, "short")}
        </span>
      </div>

      <div
        className="h-[22.5rem] overflow-hidden px-4 py-3 md:h-[16.5rem]"
        style={{ backgroundColor: theme.bgHex, color: theme.fgHex }}
      >
        <dl className="mb-3 flex flex-wrap gap-x-5 gap-y-1 border-b pb-2 font-mono text-[0.64rem]" style={{ borderColor: theme.uiBorderHex }}>
          <span className="flex gap-1.5">
            <dt style={{ color: mutedBody }}>{chrome.properties.record}</dt>
            <dd>{formatRecordDate(locale, RECORD.date, "short")}</dd>
          </span>
          <span className="flex gap-1.5">
            <dt style={{ color: mutedBody }}>{chrome.properties.schema}</dt>
            <dd>
              {RECORD.schema} · v{RECORD.schemaVersion}
            </dd>
          </span>
          <span className="flex gap-1.5">
            <dt style={{ color: mutedBody }}>{chrome.properties.tags}</dt>
            {/* Uma tag por span, com `gap`: o separador do texto corrido
             *  (`join(" ")`) encosta as duas no tamanho em que este bloco e
             *  desenhado — 0,64rem em monospace — e o espaco some na
             *  rasterizacao. Distancia entre caixas nao some. */}
            <dd className="flex flex-wrap gap-x-2 gap-y-0.5" style={{ color: theme.accentHex }}>
              {RECORD.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </dd>
          </span>
        </dl>

        <h4 className="text-[1.2rem] font-semibold leading-tight">{RECORD.title}</h4>
        <p className="mt-1 line-clamp-3 text-[0.74rem] leading-relaxed" style={{ color: mutedBody }}>
          {RECORD.lead}
        </p>

        {RECORD.sections.slice(0, 2).map((section) => (
          <section key={section.heading} className="mt-2.5">
            <p className="label-mono" style={{ color: theme.accentHex }}>
              {section.heading}
            </p>
            {section.paragraphs.slice(0, 1).map((paragraph) => (
              <p key={paragraph} className="mt-0.5 line-clamp-2 text-[0.72rem] leading-relaxed" style={{ color: mutedBody }}>
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="mt-0.5 grid gap-0.5">
                {section.bullets.slice(0, 2).map((bullet) => (
                  <li key={bullet} className="line-clamp-1 text-[0.72rem] leading-relaxed" style={{ color: mutedBody }}>
                    <span aria-hidden="true" style={{ color: theme.accentHex }}>
                      –{" "}
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <div
          className="mt-3 truncate rounded-[2px] px-2 py-1 font-mono text-[0.6rem]"
          style={{ backgroundColor: theme.editorBgHex, color: theme.editorFgHex }}
        >
          <span style={{ color: theme.accentHex }}>title:</span> {RECORD.title}
        </div>
      </div>
    </div>
  );
};

interface ThemesProps {
  locale: Locale;
}

const Themes = ({ locale }: ThemesProps) => {
  const copy = getCopy(locale);
  const themes = copy.pages.home.themes;
  const chrome = copy.pages.home.stage.chrome;
  const [selected, setSelected] = useState<string>("midnight");
  const active = ORDERED_THEMES.find((theme) => theme.id === selected) ?? ORDERED_THEMES[0];

  return (
    <section id="temas" aria-labelledby="temas-titulo" className="scroll-mt-14 border-b border-rule bg-paper text-ink">
      <div className="measure border-l border-terracotta/30 px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SectionHead id="temas" index={themes.index} label={themes.label} title={themes.title} />
          </div>
          <p className="max-w-md text-ink-soft lg:col-span-4 lg:col-start-9 lg:pb-2">{themes.text}</p>
        </div>

        <div
          role="radiogroup"
          aria-label={themes.label}
          className="mt-12 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          {ORDERED_THEMES.map((theme) => {
            const checked = theme.id === selected;
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setSelected(theme.id)}
                className={`flex min-h-[44px] items-center gap-2.5 border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  checked
                    ? "border-ink bg-ink text-paper-2"
                    : "border-rule text-ink hover:border-ink hover:bg-paper-2"
                }`}
              >
                <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
                  {[theme.bgHex, theme.fgHex, theme.accentHex].map((hex) => (
                    <span
                      key={hex}
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-ink/20"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </span>
                <span className="truncate">{theme.name}</span>
              </button>
            );
          })}
        </div>

        <p className="label-mono mt-8 text-ink-soft">
          {themes.sampleLabel} · {active.name}
        </p>
        <div className="mt-3">
          <ThemePreview theme={active} locale={locale} chrome={chrome} />
        </div>
        <p className="mt-3 font-mono text-[0.6875rem] text-ink-soft">{themes.note}</p>
      </div>
    </section>
  );
};

export default Themes;
