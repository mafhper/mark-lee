import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { DocumentTab, ThemeConfig } from "../../types";
import {
  useContextMenuTrigger,
  type ContextMenuEntry,
} from "./context-menu";

interface EditorTabsProps {
  tabs: DocumentTab[];
  activeTabId: string | null;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onCloseRight: (id: string) => void;
  onCloseSaved: () => void;
  onCloseAll: () => void;
  onNewTab: () => void;
}

const EditorTab: React.FC<{
  tab: DocumentTab;
  isActive: boolean;
  t: Record<string, string>;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onCloseRight: (id: string) => void;
  onCloseSaved: () => void;
  onCloseAll: () => void;
}> = ({ tab, isActive, t, onActivate, onClose, onCloseOthers, onCloseRight, onCloseSaved, onCloseAll }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const resolveItems = useCallback(
    (): ContextMenuEntry[] => [
      {
        type: "item",
        id: "close",
        label: t["tabs.close"] || "Close",
        onSelect: () => onClose(tab.id),
      },
      {
        type: "item",
        id: "close-others",
        label: t["tabs.closeOthers"] || "Close Others",
        onSelect: () => onCloseOthers(tab.id),
      },
      {
        type: "item",
        id: "close-right",
        label: t["tabs.closeRight"] || "Close to the Right",
        onSelect: () => onCloseRight(tab.id),
      },
      {
        type: "item",
        id: "close-saved",
        label: t["tabs.closeSaved"] || "Close Saved",
        onSelect: () => onCloseSaved(),
      },
      {
        type: "item",
        id: "close-all",
        label: t["tabs.closeAll"] || "Close All",
        onSelect: () => onCloseAll(),
      },
    ],
    [t, tab.id, onClose, onCloseOthers, onCloseRight, onCloseSaved, onCloseAll]
  );

  const { onContextMenu } = useContextMenuTrigger<HTMLDivElement>({
    ref,
    resolveItems,
  });

  return (
    <div
      ref={ref}
      data-tab-id={tab.id}
      onClick={() => onActivate(tab.id)}
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate(tab.id);
        }
      }}
      role="button"
      tabIndex={0}
      // Centrada verticalmente na barra: folga igual em cima e embaixo. As duas
      // tentativas anteriores eram assimétricas — 2,5/3,5 e depois 3/0 — e
      // assimetria é justamente o que lê como desalinhamento. Encostar numa das
      // bordas deixa a aba parecendo estar "saindo" da barra; centralizar não
      // privilegia lado nenhum. h-9 num content box de 39px dá 1,5px de cada lado.
      // A borda é transparente, não ausente: tira a linha sem mexer na geometria.
      className={`group flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs border border-transparent transition-colors duration-100 ${
        isActive
          ? "ml-btn-active"
          : "hover:bg-[color-mix(in_srgb,var(--ml-fg,#111827)_8%,transparent)]"
      }`}
    >
      <span className="truncate max-w-[140px]">
        {tab.name}
        {tab.dirty ? "*" : ""}
      </span>
      {/* ✕ com a mesma aparência na ativa e na que está sob o mouse: 70% de opacidade
          normally, 100% no próprio hover. duration-75 para o hover responder rápido. */}
      <button
        onClick={(event) => {
          event.stopPropagation();
          onClose(tab.id);
        }}
        className={`ml-btn inline-flex h-5 w-5 shrink-0 items-center justify-center transition-opacity duration-75 ${
          isActive
            ? "opacity-70 hover:!opacity-100"
            : "opacity-0 group-hover:opacity-70 hover:!opacity-100"
        }`}
        title={t["tabs.close"] || "Close"}
        aria-label={`${t["tabs.close"] || "Close"} ${tab.name}`}
        type="button"
      >
        <X size={12} />
      </button>
    </div>
  );
};

const EditorTabs: React.FC<EditorTabsProps> = ({
  tabs,
  activeTabId,
  t,
  tConfig,
  onActivate,
  onClose,
  onCloseOthers,
  onCloseRight,
  onCloseSaved,
  onCloseAll,
  onNewTab,
}) => {
  // O botão "+" precisa sobreviver ao overflow. A barra deixa de ser um fluxo
  // flex único e vira três regiões — setas · strip rolável · grupo fixo do "+".
  // Sem isto, o "+" é irmão das abas e sai da tela junto com o scrollWidth.
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState({ any: false, left: false, right: false });

  const syncOverflow = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) {
      setOverflow((prev) => (prev.any ? { any: false, left: false, right: false } : prev));
      return;
    }
    const max = strip.scrollWidth - strip.clientWidth;
    // 1px de tolerância: scrollWidth/clientWidth são inteiros e arredondam.
    const any = max > 1;
    const left = any && strip.scrollLeft > 1;
    const right = any && strip.scrollLeft < max - 1;
    setOverflow((prev) =>
      prev.any === any && prev.left === left && prev.right === right ? prev : { any, left, right },
    );
  }, []);

  // Seta = passo de uma aba, como o Terminal: rola até a próxima aba inteira,
  // não uma "página" arbitrária nem pixel a pixel.
  const step = useCallback((dir: -1 | 1) => {
    const strip = stripRef.current;
    if (!strip) return;
    const items = Array.from(strip.querySelectorAll<HTMLElement>("[data-tab-id]"));
    if (items.length === 0) return;
    const bounds = strip.getBoundingClientRect();

    if (dir === 1) {
      const clipped = items.find((el) => el.getBoundingClientRect().right > bounds.right + 1);
      const target = clipped ?? items[items.length - 1];
      const delta = target.getBoundingClientRect().right - bounds.right;
      strip.scrollTo({ left: strip.scrollLeft + delta + 8, behavior: "smooth" });
      return;
    }

    let clipped: HTMLElement | undefined;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      if (items[i].getBoundingClientRect().left < bounds.left - 1) {
        clipped = items[i];
        break;
      }
    }
    if (!clipped) {
      strip.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    const delta = bounds.left - clipped.getBoundingClientRect().left;
    strip.scrollTo({ left: strip.scrollLeft - delta - 8, behavior: "smooth" });
  }, []);

  // Re-mede quando as abas mudam e quando a janela muda de largura.
  useLayoutEffect(() => {
    syncOverflow();
  }, [syncOverflow, tabs.length, activeTabId, t]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncOverflow);
      return () => window.removeEventListener("resize", syncOverflow);
    }
    const observer = new ResizeObserver(syncOverflow);
    observer.observe(strip);
    return () => observer.disconnect();
  }, [syncOverflow]);

  // A aba ativa nunca fica fora da view — requisito R5.
  // Rola por cálculo próprio em vez de scrollIntoView: com "nearest" a última aba
  // pode ficar parcialmente cortada, e o smooth concorre com o resize.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || !activeTabId) return;
    const el = strip.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeTabId)}"]`);
    if (!el) return;
    const s = strip.getBoundingClientRect();
    const e = el.getBoundingClientRect();
    // já cabe inteira: não mexe, para a barra não ficar saltando a cada ativação
    if (e.left >= s.left + 1 && e.right <= s.right - 1) return;
    const delta = e.left + e.width / 2 - (s.left + s.width / 2);
    strip.scrollTo({ left: strip.scrollLeft + delta, behavior: "smooth" });
  }, [activeTabId, tabs.length]);

  // O fade NÃO é mask na strip: mask-image num container com overflow-x-auto cria
  // uma camada composta cuja origem não acompanha o scrollLeft, e o Chromium deixa
  // um tile fantasma na borda da barra. Só aparecia quando a strip rolava — ou
  // seja, exatamente quando os direcionais passam a funcionar. São dois gradientes
  // sobrepostos, que é a técnica equivalente sem mascarar o scroller.
  const fade = (side: "left" | "right") => ({
    backgroundImage: `linear-gradient(to ${side}, var(--ml-ui) 35%, transparent)`,
  });

  // Setas no fluxo e SEMPRE montadas — só a opacidade muda. As duas alternativas
  // que eu tentei falharam uma ou outra coisa:
  //   ·montadas só no overflow → a strip perdia 2×24px e todos os abas saltavam
  //   · sobrepostas (absolute)  → não deslocam, mas cobrem o texto e o ✕ das abas
  // Sempre no fluxo + sempre montadas: a largura da strip nunca muda E nada é
  // coberto. Os espaçadores dentro da strip garantem 24px de folga nas duas
  // pontas, então a aba nunca fica debaixo da seta em nenhum ponto do scroll.
// Sem overflow, a seta some **e larga o espaço**. Antes era `opacity-0`, que
    // mantinha os 24px reservados — e eram eles que somavam a faixa morta antes
    // da primeira aba. `hidden` tira do fluxo: sem largura, sem borda.
    //
    // O deslocamento — as abas andam 24px quando a segunda abre e o overflow
    // passa a existir — é aceito de propósito: as setas saíram de `absolute`
    // para o fluxo justamente porque, em `absolute`, elas cobriam o texto das
    // abas. O custo é uma vez; o benefício é 48px devolvidos em todo o resto do
    // tempo em que o usuário não rola abas.
    const arrowClass = (enabled: boolean) =>
      `ml-btn h-9 shrink-0 inline-flex items-center justify-center transition-opacity duration-75 ${
      !overflow.any
      ? "hidden"
      : `w-6 ${enabled ? "opacity-70 hover:opacity-100" : "opacity-20 pointer-events-none"}`
      }`;

  return (
    <div
      data-tauri-drag-region
      className={`h-10 border-b ${tConfig.uiBorder} ${tConfig.ui} ${tConfig.fg} flex items-center px-1.5 select-none`}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          step(-1);
        }}
        onDoubleClick={(event) => event.stopPropagation()}
        className={arrowClass(overflow.left)}
        disabled={!overflow.left}
        aria-disabled={!overflow.left}
        aria-hidden={!overflow.any}
        title={t["tabs.scrollLeft"] || "Previous tabs"}
        aria-label={t["tabs.scrollLeft"] || "Previous tabs"}
      >
        <ChevronLeft size={15} />
      </button>

      <div className="relative flex h-full min-w-0 flex-1">
        {/* data-tauri-drag-region também na strip: a área vazia à direita da última
            aba precisa continuar arrastando a janela. */}
        <div
          ref={stripRef}
          data-tauri-drag-region
          onScroll={syncOverflow}
          className="ml-tabs-strip flex h-full min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain"
        >
          {/* Espaçadores fixos: garantem que a primeira e a última aba fiquem
              24px longe das setas. São elementos, não padding — o Chromium às
              vezes ignora padding-right ao calcular scrollWidth. */}
          <div aria-hidden className={overflow.any ? "w-6 shrink-0" : "w-0 shrink-0 overflow-hidden"} />
          {tabs.map((tab) => (
            <EditorTab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              t={t}
              onActivate={onActivate}
              onClose={onClose}
              onCloseOthers={onCloseOthers}
              onCloseRight={onCloseRight}
              onCloseSaved={onCloseSaved}
              onCloseAll={onCloseAll}
            />
          ))}
          <div aria-hidden className={overflow.any ? "w-6 shrink-0" : "w-0 shrink-0 overflow-hidden"} />
        </div>

        {overflow.left && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-7" style={fade("right")} />
        )}
        {overflow.right && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-7" style={fade("left")} />
        )}
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          step(1);
        }}
        onDoubleClick={(event) => event.stopPropagation()}
        className={arrowClass(overflow.right)}
        disabled={!overflow.right}
        aria-disabled={!overflow.right}
        aria-hidden={!overflow.any}
        title={t["tabs.scrollRight"] || "Next tabs"}
        aria-label={t["tabs.scrollRight"] || "Next tabs"}
      >
        <ChevronRight size={15} />
      </button>

      {/* Divisória: separa "navegação" de "ação". Agora que as abas não têm
          borda, é a única linha vertical da barra — e aí ela significa algo.
          h-9 acompanha o ritmo das abas. Sai do fg, não do uiBorder: a cor de
          borda de um tema escuro é escura demais para separar nada. */}
      <div
        aria-hidden
        className="mx-1.5 h-9 w-px shrink-0"
        style={{ backgroundColor: tConfig.fgHex, opacity: 0.4 }}
      />

      <button
        onClick={onNewTab}
        title={t["file.new"] || "New file"}
        aria-label="new-tab"
        className="ml-btn h-9 w-9 shrink-0 inline-flex items-center justify-center transition-colors duration-100 hover:bg-[color-mix(in_srgb,var(--ml-fg,#111827)_8%,transparent)]"
      >
        <Plus size={15} />
      </button>
    </div>
  );
};

export default EditorTabs;
