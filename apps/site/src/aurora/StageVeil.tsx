import { RefObject, useEffect, useRef } from "react";
import { createZenEngine, type ZenWindowBox } from "@/aurora/stage-veil";
import { attachZenTrigger } from "@/aurora/zen-trigger";

/**
 * Modo zen do palco: o véu que cobre a VIEWPORT inteira.
 *
 * A janela do aplicativo é o gatilho (ponteiro ou foco de teclado) e o sujeito:
 * o véu é `position: fixed; inset: 0`, então sobe acima e desce abaixo do palco,
 * isolando a view. A janela continua nítida e escura porque o CSS a mantém num
 * nível acima — o campo de areia é claro justamente para ela recortar.
 *
 * O que mora aqui é só a ligação: um canvas, o motor que o desenha e o gatilho
 * que decide quando. Nenhum `useState` — hover em React significa re-renderizar
 * a árvore do aplicativo simulado a cada passagem do ponteiro, e o estado que o
 * CSS consome não justifica isso.
 *
 * Regras que o componente garante:
 *
 *  1. **Toque não tem efeito.** Sem `hover: hover`, não se cria motor nem
 *     listener: celular não paga por um efeito que não existe ali.
 *  2. **Sem WebGL, o véu continua.** O gradiente do CSS isola a view sozinho.
 *  3. **Rolagem e resize re-medem** a janela, para o jardim seguir a silhueta em
 *     vez de girar em volta de um retângulo que já saiu do lugar.
 */

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

/**
 * A medida que o shader precisa: centro e semi-eixos da janela na viewport, mais
 * o raio do canto. Sai do DOM em vez de ser constante para o jardim acompanhar a
 * escala do palco (o desenho de 1440 é reduzido por `transform`).
 */
function readWindowBox(element: HTMLElement | null): ZenWindowBox | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;

  const radius = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
  return {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    halfWidth: rect.width / 2,
    halfHeight: rect.height / 2,
    radius,
  };
}

interface StageVeilProps {
  /** A janela do palco: ela é o gatilho E o centro do jardim. */
  frameRef: RefObject<HTMLElement | null>;
}

const StageVeil = ({ frameRef }: StageVeilProps) => {
  const veilRef = useRef<HTMLDivElement | null>(null);
  const washRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const veil = veilRef.current;
    const wash = washRef.current;
    const frame = frameRef.current;
    if (!veil || !wash || !frame) return;
    if (!window.matchMedia(HOVER_QUERY).matches) return;

    const engine = createZenEngine(wash, () => readWindowBox(frame));
    if (!engine) {
      /* Sem WebGL o jardim não existe, mas o isolamento sim: o `data-render`
       *  publica isso para o CSS, que liga o véu de reserva (gradiente). */
      veil.dataset.render = "static";
      return;
    }
    veil.dataset.render = "shader";

    const detach = attachZenTrigger(frame, engine);

    /* Uma leitura de layout por quadro, no máximo: rolagem dispara em rajada. */
    let pending = 0;
    const remeasure = () => {
      if (pending) return;
      pending = window.requestAnimationFrame(() => {
        pending = 0;
        engine.remeasure();
      });
    };

    window.addEventListener("resize", remeasure, { passive: true });
    window.addEventListener("scroll", remeasure, { passive: true });

    return () => {
      detach();
      if (pending) window.cancelAnimationFrame(pending);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure);
      engine.destroy();
    };
  }, [frameRef]);

  return (
    <div ref={veilRef} className="stage-veil" data-stage-part="stage-veil" aria-hidden="true">
      <canvas ref={washRef} className="stage-veil__wash" />
    </div>
  );
};

export default StageVeil;
