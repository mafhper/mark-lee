import SectionHead from "@/aurora/SectionHead";
import { Locale, getCopy } from "@/i18n";

interface ToolsProps {
  locale: Locale;
}

const Tools = ({ locale }: ToolsProps) => {
  const tools = getCopy(locale).pages.home.tools;

  return (
    <section id="recursos" aria-labelledby="recursos-titulo" className="border-b border-rule bg-paper text-ink">
      <div className="measure grid gap-12 border-l border-terracotta/30 px-6 py-20 lg:grid-cols-12 lg:px-10 lg:py-28">
        <div className="lg:col-span-4">
          <SectionHead id="recursos" label={tools.label} title={tools.title} />
        </div>

        <ol className="border-t border-ink lg:col-span-8">
          {tools.rows.map((row) => (
            <li
              key={row.n}
              className="grid grid-cols-[3rem_1fr] gap-x-4 gap-y-1 border-b border-rule py-6 md:grid-cols-[3.5rem_12rem_1fr] md:items-baseline"
            >
              <span className="font-mono text-xs text-terracotta">{row.n}</span>
              <span className="font-heading text-2xl md:text-3xl">{row.name}</span>
              <span className="col-start-2 text-ink-soft md:col-start-3">{row.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default Tools;
