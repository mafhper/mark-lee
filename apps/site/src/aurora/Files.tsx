import SectionHead from "@/aurora/SectionHead";
import { DEMO_FILE_LINES, DEMO_FILE_NAME, DEMO_TREE } from "@/aurora/demo";
import { Locale, getCopy } from "@/i18n";

interface FilesProps {
  locale: Locale;
}

const Files = ({ locale }: FilesProps) => {
  const files = getCopy(locale).pages.home.files;

  return (
    <section id="arquivo" aria-labelledby="arquivo-titulo" className="scroll-mt-14 border-b border-rule bg-paper text-ink">
      <div className="measure grid gap-12 border-l border-terracotta/30 px-6 py-20 lg:grid-cols-12 lg:px-10 lg:py-28">
        <div className="lg:col-span-4">
          <SectionHead id="arquivo" index={files.index} label={files.label} title={files.title} />
        </div>

        <div className="lg:col-span-8">
          <p className="max-w-2xl text-lg leading-relaxed md:text-xl">{files.text}</p>
          <p className="mt-6 max-w-2xl border-l-2 border-terracotta pl-4 text-sm text-ink-soft">
            {files.caveat}
          </p>

          <div className="mt-12 grid border border-rule bg-paper-2 md:grid-cols-[15rem_1fr]">
            <div className="border-b border-rule p-4 md:border-b-0 md:border-r">
              <p className="label-mono mb-3 text-ink-soft">{files.folderLabel}</p>
              <ul className="font-mono text-xs leading-7">
                {DEMO_TREE.map((node) => (
                  <li
                    key={`${node.name}-${node.depth}`}
                    className={`truncate ${
                      node.active ? "text-terracotta-deep" : node.kind === "dir" ? "text-ink-soft" : "text-ink"
                    }`}
                    style={{ paddingLeft: `${node.depth * 0.9}rem` }}
                  >
                    {node.active ? "→ " : ""}
                    {node.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0 p-3 md:p-4">
              <p className="label-mono mb-3 px-2 text-ink-soft">{DEMO_FILE_NAME}</p>
              <pre className="max-h-[30rem] overflow-auto p-2 font-mono text-xs leading-6">
                <code>
                  {DEMO_FILE_LINES.map((line, index) => (
                    <span key={`${line}-${index}`} className="block whitespace-pre">
                      <span aria-hidden="true" className="mr-4 inline-block w-5 text-right text-rule">
                        {index + 1}
                      </span>
                      <span className={line.startsWith("---") ? "text-terracotta-deep" : undefined}>{line}</span>
                    </span>
                  ))}
                </code>
              </pre>
            </div>
          </div>

          <p className="mt-3 font-mono text-[0.6875rem] text-ink-soft">{files.note}</p>
        </div>
      </div>
    </section>
  );
};

export default Files;
