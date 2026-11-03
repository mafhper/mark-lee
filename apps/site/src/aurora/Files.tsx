import SectionHead from "@/aurora/SectionHead";
import { DEMO_FILE_LINES, DEMO_FILE_NAME, DEMO_TREE } from "@/aurora/demo";
import { Locale, getCopy } from "@/i18n";

interface FilesProps {
  locale: Locale;
}

/**
 * O arquivo no disco.
 *
 * Duas colunas equilibradas — o titulo e o texto na mesma linha de grade do
 * resto do site, e o visualizador ocupando a largura inteira embaixo — porque
 * o painel estreito da direita apertava o codigo e cortava o conteudo.
 *
 * O visualizador tem altura generosa (cabe o arquivo inteiro no desktop), rola
 * sem desenhar barra e quebra linha em vez de rolar na horizontal: um arquivo
 * `.md` e texto, nao uma tabela.
 */
const Files = ({ locale }: FilesProps) => {
  const files = getCopy(locale).pages.home.files;

  return (
    <section id="arquivo" aria-labelledby="arquivo-titulo" className="border-b border-rule bg-paper text-ink">
      <div className="measure border-l border-terracotta/30 px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-7">
            <SectionHead id="arquivo" index={files.index} label={files.label} title={files.title} />
          </div>
          <p className="max-w-md text-base text-ink-soft lg:col-span-4 lg:col-start-9 lg:pt-1">{files.text}</p>
        </div>

        <p className="mt-8 max-w-3xl border-l-2 border-terracotta pl-4 text-sm text-ink-soft">{files.caveat}</p>

        <div className="mt-10 grid border border-rule bg-paper-2 md:grid-cols-[15rem_minmax(0,1fr)]">
          <div className="min-w-0 border-b border-rule p-4 md:border-b-0 md:border-r">
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

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2">
              <p className="label-mono truncate text-ink-soft">{DEMO_FILE_NAME}</p>
              <span className="label-mono shrink-0 text-rule">MD · UTF-8</span>
            </div>
            <div className="fade-bottom relative h-[35rem] [--fade-to:var(--color-paper-2)] md:h-[34rem]">
              <div className="no-scrollbar h-full overflow-y-auto overflow-x-hidden px-4 py-3">
                <div className="font-mono text-xs leading-5">
                  {DEMO_FILE_LINES.map((line, index) => (
                    <div key={`${line}-${index}`} className="flex gap-3">
                      <span aria-hidden="true" className="w-4 shrink-0 text-right text-rule">
                        {index + 1}
                      </span>
                      <span
                        className={`min-w-0 whitespace-pre-wrap break-words ${
                          line.startsWith("---") ? "text-terracotta-deep" : undefined
                        }`}
                      >
                        {line}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 font-mono text-[0.6875rem] text-ink-soft">{files.note}</p>
      </div>
    </section>
  );
};

export default Files;
