/**
 * Tempo do modo zen: a curva de entrada e a máquina de fases assimétrica.
 *
 * Duas decisões explicam o arquivo:
 *
 *  1. **O estado é um único escalar.** `progress` vai de 0 a 1 e a exposição é
 *     sempre a mesma curva aplicada a ele. Como a saída percorre a curva ao
 *     contrário, ela acelera sozinha — é o `ease-in` da retração. Se o cursor
 *     sair no meio da entrada, o progresso simplesmente inverte do ponto exato
 *     em que estava: nada salta, nada espera o movimento terminar.
 *  2. **A respiração só existe com o efeito no ar.** A fase avança enquanto há
 *     véu; parada, o relógio para junto — em repouso não sobra nada rodando.
 */

import { ZenMotionTokens } from "@/aurora/zen-tokens";

/** Curva de Bézier cúbica do CSS, avaliada por tempo. */
export function cubicBezierEase(
  curve: readonly [number, number, number, number],
  progress: number,
): number {
  const [x1, y1, x2, y2] = curve;
  const clamped = Math.min(Math.max(progress, 0), 1);
  if (clamped === 0 || clamped === 1) return clamped;

  const curveX = (t: number) => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
  const curveY = (t: number) => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;

  /* Achar o parâmetro cujo X bate com o pedido. Newton converge em duas ou três
   * iterações nessa curva; a bisseção fica de rede quando a derivada achata (a
   * curva de entrada começa com inclinação zero, e Newton sozinho não sai do
   * lugar lá). */
  let low = 0;
  let high = 1;
  let t = clamped;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const error = curveX(t) - clamped;
    if (Math.abs(error) < 1e-7) return curveY(t);
    if (error < 0) low = t;
    else high = t;

    const slope = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
    t = slope < 1e-6 ? (low + high) / 2 : Math.min(Math.max(t - error / slope, low), high);
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const middle = (low + high) / 2;
    if (curveX(middle) < clamped) low = middle;
    else high = middle;
  }
  return curveY((low + high) / 2);
}

/** A exposição do efeito para um progresso: 0 apagado, 1 em estado zen pleno. */
export function zenExposure(progress: number): number {
  return cubicBezierEase(ZenMotionTokens.easings.enter, progress);
}

/**
 * Opacidade do véu na saída rápida: 1 no instante da rolagem, 0 em
 * `fastExitMs`.
 *
 * Linear de propósito: a rampa de spread da saída normal não acontece aqui — o
 * campo some por opacidade, e uma curva com cauda deixaria véu na tela depois
 * que a janela já saiu de baixo do ponteiro.
 */
export function zenFade(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs)) return 1;
  const duration = ZenMotionTokens.timings.fastExitMs;
  if (elapsedMs <= 0) return 1;
  if (elapsedMs >= duration) return 0;
  return 1 - elapsedMs / duration;
}

export interface ZenMotionState {
  /** Posição na transição: 0 apagado, 1 pleno. Avança em ritmo constante. */
  progress: number;
  /** Fase da respiração, em radianos. */
  breath: number;
  /** Tempo com o efeito no ar, em segundos — move a deriva do grão. */
  elapsed: number;
}

export interface ZenMotionStep {
  /** Tempo decorrido desde o quadro anterior, em ms. */
  dtMs: number;
  /** O ponteiro/foco está sobre a janela? */
  lit: boolean;
}

const ENTER_RATE = 1 / ZenMotionTokens.timings.enterMs;
const EXIT_RATE = 1 / ZenMotionTokens.timings.exitMs;
const BREATH_RATE = (Math.PI * 2) / ZenMotionTokens.timings.breathPeriodMs;

export function createZenMotion(): ZenMotionState {
  return { progress: 0, breath: 0, elapsed: 0 };
}

/**
 * Avança um passo. Entrada e saída têm velocidades diferentes de propósito: a
 * entrada é cerimônia, a saída é resposta.
 */
export function stepZenMotion(state: ZenMotionState, { dtMs, lit }: ZenMotionStep): ZenMotionState {
  /* Um quadro perdido não teleporta o efeito: o passo tem teto de 100ms. */
  const step = Math.max(0, Math.min(dtMs, 100));
  const rate = lit ? ENTER_RATE : EXIT_RATE;
  const progress = Math.min(Math.max(state.progress + (lit ? step : -step) * rate, 0), 1);

  /* A respiração e a deriva do grão só correm com o véu no ar; paradas, elas
   * congelam onde estavam. */
  const moving = progress > 0;
  const breath = moving ? state.breath + step * BREATH_RATE : state.breath;
  const elapsed = moving ? state.elapsed + step / 1000 : state.elapsed;

  return { progress, breath, elapsed };
}

/** O efeito está em repouso? Nesse ponto o laço pode ser encerrado. */
export function zenAtRest(state: ZenMotionState): boolean {
  return state.progress <= 0;
}
