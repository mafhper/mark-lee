import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import Wordmark from "@/aurora/Wordmark";
import "@/aurora/aurora.css";
import {
  DEFAULT_LOCALE,
  PRIMARY_HOME_SECTIONS,
  REPO_URL,
  getCopy,
  homeSectionPath,
  localeFromPathname,
  pathFor,
} from "@/i18n";

/**
 * Alinhamento óptico da barra.
 *
 * O flex do cabeçalho centraliza CAIXAS, não linhas de base: medido no DOM
 * (1440px, Inter carregada), a base de "Mark-Lee." caía em 37,59px, a dos itens
 * de navegação em 31,64px e a do rótulo de "Baixar" em 31,87px. O nome do
 * produto ficava quase 6px abaixo da linha do resto da barra — é o que se vê
 * como o M flutuando acima do texto.
 *
 * A barra tem UMA linha: a dos itens de navegação, que são a maioria, já
 * coincidem com o rótulo do botão e ficam no centro ótico da altura. O wordmark
 * sobe por `transform` (a pintura anda, a caixa e o `line-height` não), levando
 * o símbolo junto — a base do glifo encosta na mesma linha. O botão leva só o
 * arredondamento de métrica (0,23px) que separa o rótulo dele daquela linha.
 *
 * Os números são medidas, não estimativas: quem mexer em tamanho de fonte,
 * `padding` ou altura da barra precisa medir de novo. `assertHeaderBaseline` no
 * `smoke-site` denuncia a divergência antes do deploy.
 */
const HEADER_BASELINE_OFFSET = {
  wordmark: -5.95,
  download: -0.23,
} as const;

const Header = () => {
  const location = useLocation();
  const [mobileState, setMobileState] = useState({ locationKey: location.key, open: false });
  const locale = useMemo(
    () => localeFromPathname(location.pathname) ?? DEFAULT_LOCALE,
    [location.pathname]
  );
  const copy = getCopy(locale);
  const mobileOpen = mobileState.locationKey === location.key && mobileState.open;
  const sectionLabels = {
    leituras: copy.nav.product,
    arquivo: copy.nav.files,
    temas: copy.nav.customization,
  } as const;

  const closeMobileMenu = () => {
    setMobileState({ locationKey: location.key, open: false });
  };

  return (
    /* Cabecalho ESTATICO, no fluxo normal. Ele era `sticky top-0` com
     * `backdrop-blur` e `bg-paper/95`: grudado no topo, aparecia flutuando no
     * meio da pagina em captura de pagina inteira (o `position: sticky` do
     * Chromium desenha a barra na posicao do scroll, nao no topo do documento).
     * Pagina de marketing nao precisa de nav grudada; o artefato some junto.
     *
     * `relative z-[80]` NAO e resquicio de sticky: e o que mantem o menu movel
     * (que abre DENTRO do header, em fluxo) por cima do conteudo seguinte. Sem
     * isso o `<main>` pinta depois no DOM e intercepta o clique nos links do
     * menu — foi o que o smoke pegou. */
    <header className="relative z-[80] h-14 border-b border-rule bg-paper text-ink">
      <div className="measure flex h-14 items-center gap-5 px-6 lg:px-10">
        <Link
          to={pathFor(locale, "home")}
          onClick={closeMobileMenu}
          className="inline-flex items-center gap-2.5 text-[0.95rem] font-bold tracking-[-0.03em] text-ink"
          style={{ transform: `translateY(${HEADER_BASELINE_OFFSET.wordmark}px)` }}
          aria-label="Mark-Lee"
        >
          <Wordmark withMark />
        </Link>

        <nav aria-label={copy.nav.primaryAriaLabel} className="hidden items-center gap-1 lg:flex">
          {PRIMARY_HOME_SECTIONS.map((section) => (
            <Link
              key={section}
              to={homeSectionPath(locale, section)}
              className="px-2.5 py-2 text-[0.78rem] font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              {sectionLabels[section]}
            </Link>
          ))}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-2 text-[0.78rem] font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            {copy.pages.home.download.source}
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to={pathFor(locale, "downloads")}
            className="inline-flex min-h-[34px] items-center justify-center bg-ink px-3.5 text-[0.76rem] font-semibold text-paper-2 transition-colors hover:bg-terracotta-deep"
          >
            {/* O `span` existe para o deslocamento sub-pixel do rótulo: mover a
             *  caixa do botão tiraria o fundo do centro óptico da barra. */}
            <span style={{ transform: `translateY(${HEADER_BASELINE_OFFSET.download}px)` }}>
              {copy.downloadLabel}
            </span>
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center text-ink lg:hidden"
          onClick={() => setMobileState({ locationKey: location.key, open: !mobileOpen })}
          aria-expanded={mobileOpen}
          aria-controls="mobile-main-nav"
          aria-label={mobileOpen ? copy.closeMenuAria : copy.openMenuAria}
        >
          {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {mobileOpen && (
        <div id="mobile-main-nav" className="border-b border-rule bg-paper-2">
          <nav aria-label={copy.nav.mobileAriaLabel} className="measure grid gap-1 px-6 pb-4 pt-3">
            {PRIMARY_HOME_SECTIONS.map((section) => (
              <Link
                key={section}
                to={homeSectionPath(locale, section)}
                onClick={closeMobileMenu}
                className="flex min-h-[44px] items-center px-2.5 text-[0.9rem] font-semibold text-ink-soft hover:text-ink"
              >
                {sectionLabels[section]}
              </Link>
            ))}
            <Link
              to={pathFor(locale, "downloads")}
              onClick={closeMobileMenu}
              className="mt-1 flex min-h-[44px] items-center justify-center bg-ink px-3.5 text-sm font-semibold text-paper-2"
            >
              {copy.downloadLabel}
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center px-2.5 text-[0.9rem] font-semibold text-ink-soft hover:text-ink"
            >
              {copy.githubLabel}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
