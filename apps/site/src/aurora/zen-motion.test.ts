import { describe, expect, it } from "vitest";
import {
  createZenMotion,
  cubicBezierEase,
  stepZenMotion,
  zenAtRest,
  zenExposure,
  zenFade,
  type ZenMotionState,
} from "@/aurora/zen-motion";
import { ZenMotionTokens } from "@/aurora/zen-tokens";

/**
 * O tempo do efeito: quanto leva para entrar, quanto leva para sair, e o que
 * acontece quando o ponteiro muda de ideia no meio.
 *
 * Os números vêm dos tokens, não da implementação: 650ms de entrada, 200ms de
 * saída. O teste mede o tempo com passos de 60Hz — o relógio de quem olha.
 */
const STEP = 1000 / 60;

function advance(state: ZenMotionState, lit: boolean, budgetMs: number) {
  let current = state;
  let elapsed = 0;
  while (elapsed < budgetMs) {
    current = stepZenMotion(current, { dtMs: STEP, lit });
    elapsed += STEP;
    if (lit ? current.progress >= 1 : current.progress <= 0) break;
  }
  return { state: current, elapsed };
}

describe("zen easing", () => {
  it("is a cubic bezier that starts at zero and ends at one", () => {
    expect(zenExposure(0)).toBe(0);
    expect(zenExposure(1)).toBe(1);
  });

  it("arrives early: the entry curve is an ease-out", () => {
    /* Na metade do tempo, a maior parte do caminho já foi feita — é o que faz a
     * entrada ser cerimônia em vez de corrida. */
    expect(zenExposure(0.5)).toBeGreaterThan(0.75);
    expect(zenExposure(0.5)).toBeLessThan(1);
  });

  it("never goes backwards", () => {
    const values = Array.from({ length: 21 }, (_, index) => zenExposure(index / 20));
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).toBeGreaterThanOrEqual(values[index - 1]);
    }
  });

  it("reduces to the identity for a linear curve", () => {
    /* Uma bezier com os controles nos cantos não deforma o tempo: se o avaliador
     * devolvesse outra coisa, o erro estaria na conta, não na curva. */
    for (const progress of [0.1, 0.25, 0.37, 0.5, 0.75, 0.9]) {
      expect(cubicBezierEase([0, 0, 1, 1] as const, progress)).toBeCloseTo(progress, 6);
    }
  });
});

describe("zen phase machine", () => {
  it("takes the entry duration to arrive", () => {
    const { state, elapsed } = advance(createZenMotion(), true, 2000);
    expect(state.progress).toBe(1);
    expect(elapsed).toBeGreaterThanOrEqual(ZenMotionTokens.timings.enterMs - 2 * STEP);
    expect(elapsed).toBeLessThan(ZenMotionTokens.timings.enterMs + 2 * STEP);
  });

  it("takes the exit duration to disappear", () => {
    const lit: ZenMotionState = { progress: 1, breath: 0, elapsed: 0 };
    const { state, elapsed } = advance(lit, false, 2000);
    expect(state.progress).toBe(0);
    expect(zenAtRest(state)).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(ZenMotionTokens.timings.exitMs - 2 * STEP);
    expect(elapsed).toBeLessThan(ZenMotionTokens.timings.exitMs + 2 * STEP);
  });

  it("reverses from where it is, without jumping", () => {
    let state = createZenMotion();
    while (state.progress < 0.4) state = stepZenMotion(state, { dtMs: STEP, lit: true });

    const before = state.progress;
    const after = stepZenMotion(state, { dtMs: STEP, lit: false }).progress;

    expect(after).toBeLessThan(before);
    /* Um quadro de saída retira 60Hz/200ms do caminho — não zera de uma vez. */
    expect(before - after).toBeLessThan(0.2);

    const atEntry = zenExposure(after);
    expect(atEntry).toBeGreaterThan(0.1);
  });

  it("breathes only while the veil is up", () => {
    let resting = createZenMotion();
    for (let step = 0; step < 30; step += 1) resting = stepZenMotion(resting, { dtMs: STEP, lit: false });
    expect(resting.breath).toBe(0);

    const alive = advance(createZenMotion(), true, 1000).state;
    /* `advance` para na chegada (650ms), então a respiração é medida com passos
     * soltos: um segundo de um ciclo de 9s anda 2π/9 radianos. */
    expect(alive.progress).toBe(1);

    let breathing = createZenMotion();
    for (let step = 0; step < 60; step += 1) breathing = stepZenMotion(breathing, { dtMs: STEP, lit: true });
    expect(breathing.breath).toBeCloseTo((Math.PI * 2) / 9, 3);
  });

  it("caps a long frame so the effect never teleports", () => {
    const state = stepZenMotion(createZenMotion(), { dtMs: 5000, lit: true });
    expect(state.progress).toBeLessThan(0.25);
  });

  it("fades the veil out linearly in the fast exit", () => {
    /* A rolagem não pode esperar a cerimônia: 150ms e o campo sumiu. O valor
     * sai da ficha (`fastExitMs`), e a rampa é linear de propósito — uma cauda
     * aqui é véu na tela depois que a janela já saiu de baixo do ponteiro. */
    const duration = ZenMotionTokens.timings.fastExitMs;
    expect(duration).toBeGreaterThanOrEqual(120);
    expect(duration).toBeLessThanOrEqual(180);

    expect(zenFade(-10)).toBe(1);
    expect(zenFade(0)).toBe(1);
    expect(zenFade(duration / 2)).toBeCloseTo(0.5, 5);
    expect(zenFade(duration)).toBe(0);
    expect(zenFade(duration * 4)).toBe(0);
  });
});
