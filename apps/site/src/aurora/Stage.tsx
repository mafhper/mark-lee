import { useState } from "react";
import editorShot from "@/assets/editor-workspace.png";
import memoriesShot from "@/assets/memories-record.png";
import SectionHead from "@/aurora/SectionHead";
import { DEMO_FILE_LINES } from "@/aurora/demo";
import { Locale, StageView, getCopy } from "@/i18n";

interface StageProps {
  locale: Locale;
}

/**
 * Palco: o mesmo arquivo em tres leituras. As duas primeiras sao capturas
 * reais do aplicativo; a terceira e o texto do arquivo, que e codigo, nao
 * interface — nao ha o que capturar.
 */
const Stage = ({ locale }: StageProps) => {
  const stage = getCopy(locale).pages.home.stage;
  const [view, setView] = useState<StageView>("editor");
  const current = stage.views.find((item) => item.id === view) ?? stage.views[0];

  return (
    <section
      id="leituras"
      aria-labelledby="leituras-titulo"
      className="margins-stage relative scroll-mt-14 overflow-hidden border-b border-stage-rule bg-stage text-stage-foreground"
    >
      <div className="measure border-l border-stage-accent/30 px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SectionHead id="leituras" index={stage.index} label={stage.label} title={stage.title} tone="stage" />
          </div>
          <p className="max-w-md text-base text-stage-foreground/80 lg:col-span-4 lg:col-start-9 lg:pb-2">
            {stage.intro}
          </p>
        </div>

        <div role="tablist" aria-label={stage.label} className="mt-12 inline-flex flex-wrap border border-stage-rule">
          {stage.views.map((item) => {
            const active = item.id === view;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`aba-${item.id}`}
                aria-selected={active}
                aria-controls={`painel-${item.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setView(item.id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                  event.preventDefault();
                  const index = stage.views.findIndex((entry) => entry.id === view);
                  const step = event.key === "ArrowRight" ? 1 : -1;
                  const next = stage.views[(index + step + stage.views.length) % stage.views.length];
                  setView(next.id);
                  document.getElementById(`aba-${next.id}`)?.focus();
                }}
                className={`min-h-[44px] border-r border-stage-rule px-5 text-sm font-semibold transition-colors last:border-r-0 ${
                  active ? "bg-stage-foreground text-stage" : "text-stage-foreground hover:bg-stage-2"
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>

        <div className="mt-6 -mx-6 border-y border-stage-rule bg-stage-2 p-2 md:mx-0 md:border md:p-3">
          {view === "source" ? (
            <pre
              id="painel-source"
              role="tabpanel"
              aria-labelledby="aba-source"
              tabIndex={0}
              className="max-h-[32rem] overflow-auto p-4 font-mono text-xs leading-6 text-stage-foreground"
            >
              <code>
                {DEMO_FILE_LINES.map((line, index) => (
                  <span key={`${line}-${index}`} className="block">
                    <span aria-hidden="true" className="mr-4 inline-block w-6 text-right text-stage-rule">
                      {index + 1}
                    </span>
                    <span className={line.startsWith("---") ? "text-stage-accent" : undefined}>{line}</span>
                  </span>
                ))}
              </code>
            </pre>
          ) : (
            <div
              id={`painel-${view}`}
              role="tabpanel"
              aria-labelledby={`aba-${view}`}
              tabIndex={0}
              className="overflow-x-auto overscroll-x-contain border border-ink/15 bg-paper-2 p-2 shadow-[0_28px_64px_-28px_rgba(0,0,0,0.75)] [scrollbar-color:color-mix(in_oklab,var(--color-ink)_35%,transparent)_transparent] [scrollbar-width:thin] md:p-3 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-ink/30 [&::-webkit-scrollbar-track]:bg-transparent"
            >
              <img
                src={view === "editor" ? editorShot : memoriesShot}
                width={1440}
                height={900}
                alt={view === "editor" ? stage.editorAlt : stage.memoriesAlt}
                className="block h-auto w-full min-w-[34rem] border border-ink/10 contrast-[1.04] saturate-[1.02] md:min-w-0"
                loading="eager"
                decoding="sync"
              />
            </div>
          )}
        </div>

        <p className="mt-4 text-sm text-stage-foreground/75">{current.caption}</p>
        <p className="mt-8 border-t border-stage-rule pt-4 font-mono text-[0.6875rem] text-stage-muted">
          {stage.note}
        </p>
      </div>
    </section>
  );
};

export default Stage;
