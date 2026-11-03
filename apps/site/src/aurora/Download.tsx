import logoPlate from "@/assets/logo-paper-tile.svg";
import Wordmark from "@/aurora/Wordmark";
import { Locale, RELEASES_URL, REPO_URL, getCopy } from "@/i18n";

interface DownloadProps {
  locale: Locale;
}

const PLATFORMS = [
  { platform: "windows", os: "Windows" },
  { platform: "macos", os: "macOS" },
  { platform: "linux", os: "Linux" },
] as const;

/**
 * Encerramento: download sem persuasao. A placa (V2) e a variante que
 * sobrevive fora do paper; aqui ela ancora a assinatura do rodape.
 */
const Download = ({ locale }: DownloadProps) => {
  const download = getCopy(locale).pages.home.download;

  return (
    <footer id="download" aria-labelledby="download-titulo" className="bg-paper text-ink">
      <div className="measure border-l border-terracotta/30 px-6 pb-10 pt-20 lg:px-10 lg:pt-28">
        <p className="label-mono text-ink-soft">{download.label}</p>

        <h2 id="download-titulo" className="font-display-tight mt-4 text-[clamp(3rem,10vw,8rem)]">
          <span className="inline-flex items-center gap-4 sm:gap-6">
            <img src={logoPlate} alt="" className="h-[0.72em] w-[0.72em]" />
            <Wordmark />
          </span>
        </h2>

        <ul className="mt-12 border-t border-ink">
          {PLATFORMS.map(({ platform, os }) => (
            <li key={platform}>
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 border-b border-rule py-6 transition-colors hover:bg-paper-2 md:grid-cols-[14rem_1fr_auto]"
              >
                <span className="font-heading text-3xl md:text-4xl">{os}</span>
                <span className="col-span-2 row-start-2 text-sm text-ink-soft md:col-span-1 md:row-start-auto">
                  {download.formats[platform]}
                </span>
                <span className="col-start-2 row-start-1 text-sm md:col-start-auto md:row-start-auto">
                  {download.cta} <span aria-hidden="true">↗</span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-16 flex flex-wrap justify-between gap-4 font-mono text-[0.6875rem] text-ink-soft">
          <span>{download.license}</span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink"
          >
            {download.source} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Download;
