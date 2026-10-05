import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface ToolbarDropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

interface ToolbarDropdownProps {
  /** Rótulo acessível do botão. Vira também o texto visível quando
   *  `showLabel` é verdadeiro. */
  label: string;
  icon: React.ReactNode;
  items: ToolbarDropdownItem[];
  /** `icon_only` é o padrão da barra: o botão é um quadrado de 32px. */
  showLabel?: boolean;
  className?: string;
}

/**
 * Dropdown de clique esquerdo para a faixa de formatação — o agrupamento das
 * três listas em um botão só, no espírito do VS Code.
 *
 * **Por que um primitivo e não o painel de overflow da barra:** aquele é
 * escopado por seção (`overflowPanelRefs`), posicionado pelo cálculo de
 * overflow e alimentado pelo contador `+N`. Agrupar listas é outra coisa, e
 * acoplar as duas faria o painel de transbordo carregar com um menu que não é
 * dele.
 *
 * **O que fecha:** clique fora, `Escape`, perda de foco do grupo, e a própria
 * seleção. Os quatro são o que uma pessoa espera; faltar um deles é o que faz um
 * menu "grudar" na tela. `Escape` devolve o foco ao gatilho, para que o teclado
 * não fique solto no `body` depois que o painel some.
 *
 * **Por que `layout` e não `effect`:** a posição precisa ser conhecida antes do
 * primeiro pixel, senão o painel aparece no canto e salta para baixo no quadro
 * seguinte. Medido com `getBoundingClientRect`, e reposicionado em `resize` e
 * `scroll` porque a barra é arrastável e um menu preso a coordenadas vira
 * órfão quando a janela se mexe.
 */
const ToolbarDropdown: React.FC<ToolbarDropdownProps> = ({ label, icon, items, showLabel = false, className = "" }) => {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null);
  const botaoRef = useRef<HTMLButtonElement | null>(null);
  const painelRef = useRef<HTMLDivElement | null>(null);

  const fechar = useCallback(() => setAberto(false), []);

  const medir = useCallback(() => {
    const botao = botaoRef.current;
    if (!botao) return;
    const r = botao.getBoundingClientRect();
    const altura = painelRef.current?.offsetHeight ?? 0;
    const largura = painelRef.current?.offsetWidth ?? 0;
    // Abre **para baixo** quando cabe, e para cima quando não cabe — numa
    // janela baixa um menu que sai pela borda é um menu que o usuário não vê.
    const cabeAbaixo = window.innerHeight - r.bottom >= altura + 8;
    setPosicao({
      top: cabeAbaixo ? r.bottom + 4 : Math.max(8, r.top - altura - 4),
      left: Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - largura - 8)),
    });
  }, []);

  useLayoutEffect(() => {
    if (aberto) medir();
  }, [aberto, items.length, medir]);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (event: MouseEvent) => {
      const alvo = event.target as Node;
      if (painelRef.current?.contains(alvo) || botaoRef.current?.contains(alvo)) return;
      fechar();
    };
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      fechar();
      // Devolve o foco: sem isto o teclado fica sem dono depois que o painel
      // some, e a próxima tecla vai para o documento.
      botaoRef.current?.focus();
    };
    const aoMexer = () => medir();
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar, true);
    window.addEventListener("resize", aoMexer);
    window.addEventListener("scroll", aoMexer, true);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar, true);
      window.removeEventListener("resize", aoMexer);
      window.removeEventListener("scroll", aoMexer, true);
    };
  }, [aberto, fechar, medir]);

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((anterior) => !anterior)}
        className={`ml-btn h-8 shrink-0 inline-flex items-center justify-center gap-1 transition-colors duration-100 hover:bg-[color-mix(in_srgb,var(--ml-fg,#111827)_8%,transparent)] ${
          showLabel ? "px-2 text-[11px]" : "w-8"
        } ${className}`}
      >
        {icon}
        {showLabel && (
          <>
            <span>{label}</span>
            <ChevronDown size={11} />
          </>
        )}
      </button>
      {aberto && (
        <div
          ref={painelRef}
          role="menu"
          aria-label={label}
          className="fixed z-[70] min-w-[168px] py-1 rounded-md border shadow-lg"
          style={{
            top: posicao?.top ?? 0,
            left: posicao?.left ?? 0,
            backgroundColor: "var(--ml-ui, #fff)",
            borderColor: "var(--ml-ui-border, #e5e7eb)",
            color: "var(--ml-fg, #111827)",
            visibility: posicao ? "visible" : "hidden",
          }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                fechar();
                item.onSelect();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:bg-[color-mix(in_srgb,var(--ml-fg,#111827)_8%,transparent)]"
            >
              <span className="w-4 shrink-0 inline-flex items-center justify-center">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.shortcut && <span className="opacity-60 tabular-nums">{item.shortcut}</span>}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default ToolbarDropdown;