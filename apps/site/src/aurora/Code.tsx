import SectionHead from "@/aurora/SectionHead";
import { Locale, REPO_URL, getCopy } from "@/i18n";

interface CodeProps {
  locale: Locale;
}

const Code = ({ locale }: CodeProps) => {
  const code = getCopy(locale).pages.home.code;

  return (
    <section id="codigo" aria-labelledby="codigo-titulo" className="border-b border-rule bg-paper text-ink">
      <div className="measure grid gap-12 border-l border-terracotta/30 px-6 py-20 lg:grid-cols-12 lg:px-10 lg:py-28">
        <div className="lg:col-span-4">
          <SectionHead id="codigo" index={code.index} label={code.label} title={code.title} />
        </div>

        <div className="lg:col-span-8">
          <p className="max-w-2xl text-lg leading-relaxed md:text-xl">{code.text}</p>

          <dl className="mt-10 grid grid-cols-2 border-l border-t border-rule md:grid-cols-4">
            {code.stack.map(([key, value]) => (
              <div key={key} className="border-b border-r border-rule p-4">
                <dt className="label-mono text-ink-soft">{key}</dt>
                <dd className="font-heading mt-2 text-xl">{value}</dd>
              </div>
            ))}
          </dl>

          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex min-h-[44px] items-center gap-2 border border-ink px-5 text-sm font-semibold transition-colors hover:bg-ink hover:text-paper-2"
          >
            {code.cta}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default Code;
