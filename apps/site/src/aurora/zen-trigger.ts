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
  /** Aborta a saída e dissolve o campo só por opacidade, sem rampa de spread. */
  fastExit(): void;
}

export interface ZenTriggerOptions {
  /** Espera de intenção, em ms. O padrão é o token. */
  dwellMs?: number;
}

/**
 * Teclas que rolam a página.
 *
 * O gatilho também acende por foco de teclado, então essas teclas com o véu no
 * ar são rolagem — e rolagem é exatamente o caso em que o campo não pode
 * animar: ele é fixo na viewport e a janela anda com a página.
 */
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"]);

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

  /**
   * Rolagem com o efeito no ar: aborta e dissolve em opacidade.
   *
   * Sair do jeito cerimonioso enquanto o dedo rola faria o jardim passear pela
   * tela, porque o centro do campo é a janela e a janela anda. O aviso ao motor
   * é incondicional de propósito: uma rolagem que chega logo depois do
   * `mouseleave` ainda encontra a saída em curso, e é o motor — não o gatilho —
   * quem sabe se há campo para dissolver.
   */
  const abort = () => {
    /* Rolagem também cancela uma entrada a caminho: quem rola não está
     * apontando, e acender depois do scroll seria o pisca que o dwell evita. */
    disarm();
    const wasLit = lit;
    lit = false;
    if (wasLit && doc.body) delete doc.body.dataset.zen;
    target.fastExit();
  };

  const onScrollInput = () => abort();

  const onScrollKey = (event: KeyboardEvent) => {
    if (SCROLL_KEYS.has(event.key)) abort();
  };

  element.addEventListener("mouseenter", onEnter);
  element.addEventListener("mouseleave", onLeave);
  element.addEventListener("focusin", onFocusIn);
  element.addEventListener("focusout", onFocusOut);

  /* Captura na fase de captura: o `wheel` de um painel interno não pode ser
   *  engolido antes de chegar aqui. Todos passivos — o efeito lê a rolagem, não
   *  a segura. */
  doc.addEventListener("wheel", onScrollInput, { passive: true, capture: true });
  doc.addEventListener("touchmove", onScrollInput, { passive: true, capture: true });
  doc.addEventListener("keydown", onScrollKey, true);

  return () => {
    disarm();
    hovered = false;
    focused = false;
    douse();
    element.removeEventListener("mouseenter", onEnter);
    element.removeEventListener("mouseleave", onLeave);
    element.removeEventListener("focusin", onFocusIn);
    element.removeEventListener("focusout", onFocusOut);
    doc.removeEventListener("wheel", onScrollInput, true);
    doc.removeEventListener("touchmove", onScrollInput, true);
    doc.removeEventListener("keydown", onScrollKey, true);
  };
}
