/**
 * O gatilho do modo zen: espera de intenção, estado no `body`, aviso ao motor.
 *
 * Por que nada de `useState` aqui: hover em React significa re-render a cada
 * entrada e a cada saída — o palco é a árvore inteira do aplicativo simulado, e
 * re-renderizá-la porque o ponteiro passou por cima custa caro por um estado que
 * só o CSS consome. Por que nada de `:hover` puro: sem uma espera, atravessar a
 * janela a caminho de um link acende o véu inteiro por um quadro — pisca.
 *
 * Então o estado mora em dois lugares e em nenhum deles no React:
 *
 *  - `document.body.dataset.zen` publica "aceso" para o CSS (é o que anima véu,
 *    janela e o resto da página);
 *  - o motor gráfico recebe `setLit` para abrir e fechar o laço do canvas.
 *
 * A saída não espera: quem tirou o ponteiro decidiu navegar. Só a entrada tem
 * `dwell` — e ele é cancelado se o ponteiro sair antes de vencer.
 */

import { ZenMotionTokens } from "@/aurora/zen-tokens";

/** O que o gatilho precisa do motor gráfico. */
export interface ZenLitTarget {
  setLit(lit: boolean): void;
}

export interface ZenTriggerOptions {
  /** Espera de intenção, em ms. O padrão é o token. */
  dwellMs?: number;
}

/**
 * Liga o gatilho a um elemento e devolve a função que desliga tudo.
 *
 * Vale hover e foco de teclado: o véu responde a quem aponta e a quem chega de
 * `Tab`. Sair do foco para um elemento de dentro da janela não apaga — o foco
 * ainda está lá.
 */
export function attachZenTrigger(
  element: HTMLElement,
  target: ZenLitTarget,
  options: ZenTriggerOptions = {},
): () => void {
  const doc = element.ownerDocument;
  const dwell = options.dwellMs ?? ZenMotionTokens.timings.dwellMs;

  let hovered = false;
  let focused = false;
  let lit = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const wants = () => hovered || focused;

  const light = () => {
    if (lit) return;
    lit = true;
    if (doc.body) doc.body.dataset.zen = "true";
    target.setLit(true);
  };

  const douse = () => {
    if (!lit) return;
    lit = false;
    if (doc.body) delete doc.body.dataset.zen;
    target.setLit(false);
  };

  const disarm = () => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  };

  const arm = () => {
    if (lit || timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      if (wants()) light();
    }, dwell);
  };

  const onEnter = () => {
    hovered = true;
    arm();
  };

  const onLeave = () => {
    hovered = false;
    disarm();
    if (!wants()) douse();
  };

  const onFocusIn = () => {
    focused = true;
    arm();
  };

  const onFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && element.contains(next)) return;
    focused = false;
    disarm();
    if (!wants()) douse();
  };

  element.addEventListener("mouseenter", onEnter);
  element.addEventListener("mouseleave", onLeave);
  element.addEventListener("focusin", onFocusIn);
  element.addEventListener("focusout", onFocusOut);

  return () => {
    disarm();
    hovered = false;
    focused = false;
    douse();
    element.removeEventListener("mouseenter", onEnter);
    element.removeEventListener("mouseleave", onLeave);
    element.removeEventListener("focusin", onFocusIn);
    element.removeEventListener("focusout", onFocusOut);
  };
}
