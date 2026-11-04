import { RefObject, useEffect, useRef } from "react";
import { VeilFrame, createVeilField, veilFrame } from "@/aurora/stage-veil";

/**
 * Modo de concentração do palco: o véu que cobre a VIEWPORT inteira.
 *
 * A janela do aplicativo é o gatilho (hover ou foco de teclado) e o sujeito: o
 * véu é `position: fixed; inset: 0`, então sobe acima e desce abaixo do palco,
 * isolando a view — o hero, as seções seguintes e o rodapé ficam atrás dele. A
 * janela continua nítida porque o CSS a mantém num nível acima (o véu tem
 * `z-index` menor); nada aqui mexe nisso.
 *
 * O desenho é canvas 2D, e as decisões que importam:
 *
 *  1. **Nada roda em repouso.** O laço de `requestAnimationFrame` nasce na
 *     entrada e morre na saída. Parado, custo zero — não existe "animação
 *     pausada" consumindo quadro.
 *  2. **Pausa de verdade.** `document.hidden` e sair da seção (medido por
 *     `IntersectionObserver`) cancelam o quadro. Voltar retoma.
 *  3. **DPR limitado a 2.** Acima disso o canvas paga 4x de área por um ganho
 *     que ninguém vê num campo de glifos a 6% de opacidade.
 *  4. **30 quadros por segundo, não 60.** A deriva anda ~1px/s; metade dos
 *     quadros é invisível e metade do custo.
 *  5. **Rolagem não é travada.** `overflow: hidden` no documento remove a barra
 *     de rolagem e desloca a página ~15px — o salto que a especificação
 *     proíbe. O véu cobre; não prende. Rolar com ele no ar empurra a janela
 *     para longe do ponteiro, o hover cai e o véu sai — sozinho, sem salto.
 *  6. **Movimento reduzido = véu estático.** Um quadro só, com os glifos na
 *     posição base e sem ondas: o isolamento continua, o movimento não. É a
 *     decisão registrada no CSS também (`prefers-reduced-motion: reduce`).
 *  7. **Toque não tem efeito.** `@media (hover: none)` esconde o véu e o JS nem
 *     escuta — celular não paga por um efeito que não existe ali.
 *
 * A licença do efeito: a ideia (campo de glifos, brilhos, ondas) veio de uma
 * referência de 21st.dev, mas nenhuma linha dela foi usada. O que está aqui é
 * geometria nossa, medida pelo teste do modelo (`stage-veil.test.ts`).
 */

/** Cor base dos glifos: o `stage-foreground` do sistema, em canais RGB. */
const GLYPH_INK = "237, 240, 238";

/** Brilho de acento: o `stage-accent` (terracota do palco) em canais RGB. */
const GLOW_INK: Record<"accent" | "light", string> = {
  accent: "218, 132, 98",
  light: "237, 240, 238",
};

/** Fonte mono do próprio sistema — nenhuma fonte nova entra no site. */
const GLYPH_FONT = "12px ui-monospace, SFMono-Regular, Menlo, monospace";

/** 30fps: a deriva é lenta o bastante para não merecer 60. */
const FRAME_INTERVAL = 1000 / 30;

const HOVER_QUERY = "(hover: hover)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Aplica um quadro ao contexto. Sem decisão de desenho: o que o modelo devolve
 * é o que aparece, na ordem — brilhos (fundo), glifos, ondas (frente).
 */
function paintVeil(context: CanvasRenderingContext2D, frame: VeilFrame) {
  context.clearRect(0, 0, frame.width, frame.height);

  context.globalAlpha = 1;
  for (const glow of frame.glows) {
    const ink = GLOW_INK[glow.tone];
    const gradient = context.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glow.radius);
    gradient.addColorStop(0, `rgba(${ink}, ${glow.alpha})`);
    gradient.addColorStop(0.55, `rgba(${ink}, ${glow.alpha * 0.4})`);
    gradient.addColorStop(1, `rgba(${ink}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(glow.x - glow.radius, glow.y - glow.radius, glow.radius * 2, glow.radius * 2);
  }

  context.fillStyle = `rgb(${GLYPH_INK})`;
  context.font = GLYPH_FONT;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const glyph of frame.glyphs) {
    context.globalAlpha = glyph.alpha;
    context.fillText(glyph.char, glyph.x, glyph.y);
  }

  context.globalAlpha = 1;
  context.strokeStyle = `rgb(${GLYPH_INK})`;
  for (const ring of frame.rings) {
    context.globalAlpha = ring.alpha;
    context.lineWidth = ring.width;
    context.beginPath();
    context.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    context.stroke();
  }
  context.globalAlpha = 1;
}

interface StageVeilProps {
  /** A janela do palco: o centro dela é o centro das ondas. */
  frameRef: RefObject<HTMLElement | null>;
}

const StageVeil = ({ frameRef }: StageVeilProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stage = canvas.closest(".stage-focus");
    if (!stage) return;

    /* Toque: o CSS já esconde o véu. Não escutar é mais barato que escutar e
     *  decidir depois — e garante que nenhum laço nasça sem hover. */
    if (!window.matchMedia(HOVER_QUERY).matches) return;

    const reducedMotion = window.matchMedia(REDUCED_QUERY);
    const context = canvas.getContext("2d");
    const still = () => reducedMotion.matches;

    let field: ReturnType<typeof createVeilField> | null = null;
    let active = false;
    let inView = true;
    let handle = 0;
    let startedAt = 0;
    let paintedAt = 0;

    /**
     * Mede a viewport, ajusta o bitmap e remonta o campo. Devolve `false`
     * quando não há o que pintar (véu escondido por CSS, canvas sem tamanho).
     */
    const fit = (): boolean => {
      const width = Math.round(canvas.clientWidth);
      const height = Math.round(canvas.clientHeight);
      if (!width || !height || !context) return false;

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const bitmapWidth = Math.round(width * ratio);
      const bitmapHeight = Math.round(height * ratio);
      if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
        canvas.width = bitmapWidth;
        canvas.height = bitmapHeight;
      }
      /* O contexto trabalha em px de CSS; o bitmap carrega o DPR. */
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const rect = frameRef.current?.getBoundingClientRect();
      const origin =
        rect && rect.width > 0 && rect.height > 0
          ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
          : { x: width / 2, y: height / 2 };

      field = createVeilField({ width, height, origin });
      return true;
    };

    const draw = (now: number) => {
      if (!context || !field) return;
      const elapsed = still() ? 0 : now - startedAt;
      paintVeil(context, veilFrame(field, { time: elapsed / 1000, elapsed }));
    };

    const tick = (now: number) => {
      handle = 0;
      if (!active || !inView || document.hidden) return;
      if (!still() && now - paintedAt < FRAME_INTERVAL - 1) {
        handle = window.requestAnimationFrame(tick);
        return;
      }
      paintedAt = now;
      draw(now);
      /* Movimento reduzido: um quadro e nada mais. */
      if (!still()) handle = window.requestAnimationFrame(tick);
    };

    const resume = () => {
      if (!active || !inView || document.hidden || handle) return;
      paintedAt = 0;
      handle = window.requestAnimationFrame(tick);
    };

    const hold = () => {
      if (!handle) return;
      window.cancelAnimationFrame(handle);
      handle = 0;
    };

    const start = () => {
      if (active) return;
      active = true;
      if (!fit()) {
        active = false;
        return;
      }
      startedAt = performance.now();
      paintedAt = 0;
      if (still()) {
        draw(startedAt);
        return;
      }
      resume();
    };

    const stop = () => {
      active = false;
      hold();
    };

    const onPointerEnter = () => start();
    const onPointerLeave = () => stop();
    const onFocusIn = () => start();
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && stage.contains(next)) return;
      stop();
    };
    const onResize = () => {
      if (!active) return;
      if (!fit()) return;
      if (still()) {
        draw(performance.now());
        return;
      }
      resume();
    };
    const onVisibility = () => {
      if (document.hidden) hold();
      else resume();
    };

    stage.addEventListener("pointerenter", onPointerEnter);
    stage.addEventListener("pointerleave", onPointerLeave);
    stage.addEventListener("focusin", onFocusIn);
    stage.addEventListener("focusout", onFocusOut);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver((entries) => {
        inView = entries[entries.length - 1]?.isIntersecting ?? true;
        if (!inView) hold();
        else resume();
      });
      observer.observe(stage);
    }

    return () => {
      hold();
      observer?.disconnect();
      stage.removeEventListener("pointerenter", onPointerEnter);
      stage.removeEventListener("pointerleave", onPointerLeave);
      stage.removeEventListener("focusin", onFocusIn);
      stage.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [frameRef]);

  return (
    <div className="stage-veil" data-stage-part="stage-veil" aria-hidden="true">
      <canvas ref={canvasRef} className="stage-veil__canvas" />
    </div>
  );
};

export default StageVeil;
