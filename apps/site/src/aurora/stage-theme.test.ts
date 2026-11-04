import { describe, expect, it } from "vitest";
import {
  browserVisitStore,
  nextStageTheme,
  themeIndexForClock,
  themeIndexForVisit,
  type VisitStore,
} from "@/aurora/stage-theme";
import { THEME_ORDER } from "@/aurora/theme-tokens";

/**
 * A rotação de tema do palco.
 *
 * O que este teste protege é a palavra "determinístico": a mesma visita tem de
 * dar o mesmo tema, a sequência não pode repetir antes de fechar os doze, e o
 * caminho sem `localStorage` tem de continuar funcionando — é o que roda em
 * janela privada e o que ninguém testa à mão.
 */
const DAY = 86_400_000;

function memoryStore(initial: number | null = null) {
  const state = { value: initial, writes: 0 };
  const store: VisitStore = {
    available: true,
    read: () => state.value,
    write: (next: number) => {
      state.value = next;
      state.writes += 1;
    },
  };
  return { store, state };
}

describe("theme rotation", () => {
  it("walks the twelve in order and comes back to the first", () => {
    expect(themeIndexForVisit(0, 12)).toBe(0);
    expect(themeIndexForVisit(1, 12)).toBe(1);
    expect(themeIndexForVisit(11, 12)).toBe(11);
    expect(themeIndexForVisit(12, 12)).toBe(0);
    expect(themeIndexForVisit(13, 12)).toBe(1);
  });

  it("never returns an index outside the list", () => {
    for (const visits of [-3, -1, 0, 5, 12, 999]) {
      const index = themeIndexForVisit(visits, THEME_ORDER.length);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(THEME_ORDER.length);
    }
  });

  it("gives consecutive visits distinct themes", () => {
    const { store, state } = memoryStore();
    const sequence = [0, 1, 2].map(() => nextStageTheme(store, 0));

    expect(new Set(sequence).size).toBe(3);
    expect(sequence).toEqual([THEME_ORDER[0], THEME_ORDER[1], THEME_ORDER[2]]);
    expect(state.value).toBe(3);
  });

  it("closes the cycle after twelve visits", () => {
    const { store } = memoryStore();
    const sequence = Array.from({ length: 13 }, () => nextStageTheme(store, 0));
    expect(sequence[0]).toBe(THEME_ORDER[0]);
    expect(sequence[12]).toBe(THEME_ORDER[0]);
    expect(new Set(sequence.slice(0, 12)).size).toBe(12);
  });

  it("consumes exactly one visit per load", () => {
    const { store, state } = memoryStore(5);
    expect(nextStageTheme(store, 0)).toBe(THEME_ORDER[5]);
    expect(state.writes).toBe(1);
  });
});

describe("without localStorage", () => {
  it("falls back to the days since epoch", () => {
    expect(themeIndexForClock(0, 12)).toBe(0);
    expect(themeIndexForClock(5 * DAY, 12)).toBe(5);
    expect(themeIndexForClock(17 * DAY, 12)).toBe(5);
    expect(themeIndexForClock(17 * DAY + DAY / 2, 12)).toBe(5);
  });

  it("still rotates the theme, one per day", () => {
    const store: VisitStore = { available: false, read: () => null, write: () => {} };

    const today = nextStageTheme(store, 5 * DAY);
    expect(today).toBe(THEME_ORDER[5]);
    expect(nextStageTheme(store, 5 * DAY)).toBe(today);

    expect(nextStageTheme(store, 6 * DAY)).toBe(THEME_ORDER[6]);
    expect(nextStageTheme(store, 6 * DAY)).not.toBe(today);
  });

  it("survives a storage that throws on every call", () => {
    const broken = {
      localStorage: {
        getItem: () => {
          throw new Error("bloqueado");
        },
        setItem: () => {
          throw new Error("bloqueado");
        },
        removeItem: () => {
          throw new Error("bloqueado");
        },
      },
    } as unknown as Window;

    const store = browserVisitStore(broken);
    expect(store.available).toBe(false);
    expect(store.read()).toBeNull();
    expect(() => store.write(3)).not.toThrow();
    expect(nextStageTheme(store, 2 * DAY)).toBe(THEME_ORDER[2]);
  });

  it("reads back what it wrote when the storage works", () => {
    const memory = new Map<string, string>();
    const scope = {
      localStorage: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => void memory.set(key, value),
        removeItem: (key: string) => void memory.delete(key),
      },
    } as unknown as Window;

    const store = browserVisitStore(scope);
    expect(store.available).toBe(true);
    expect(store.read()).toBeNull();

    store.write(7);
    expect(store.read()).toBe(7);
    expect(nextStageTheme(store, 0)).toBe(THEME_ORDER[7]);
  });
});
