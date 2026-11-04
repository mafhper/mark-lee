import { describe, expect, it } from "vitest";
import {
  VEIL_CELL,
  VEIL_GLOW_COUNT,
  VEIL_GLYPH_ALPHA_MAX,
  VEIL_GLYPH_ALPHA_MIN,
  VEIL_RING_COUNT,
  createVeilField,
  veilFrame,
} from "@/aurora/stage-veil";

/**
 * O veu de concentracao e desenhado a partir de um modelo puro: grade de
 * glifos, brilhos e ondas. O teste fixa o que o olho cobra — densidade baixa,
 * opacidade de vela, deriva lenta que nao sai da tela, ondas que acontecem uma
 * vez — sem tocar em canvas, DOM ou relogio. O canvas so aplica o quadro.
 *
 * Os numeros esperados vem da especificacao do efeito, nao da implementacao:
 * 64px de celula, 6% a 12% de opacidade, duas ondas, tres brilhos.
 */
const LAYOUT = { width: 1440, height: 900, origin: { x: 720, y: 468 } };

const field = createVeilField(LAYOUT);

describe("stage veil field", () => {
  it("lays a low-density glyph grid over the whole viewport", () => {
    /** 1440/64 = 22 colunas de passo + a coluna da borda; 900/64 = 14 + 1. */
    expect(field.glyphs.length).toBeGreaterThan(240);
    expect(field.glyphs.length).toBeLessThan(300);

    const xs = field.glyphs.map((glyph) => glyph.x);
    const ys = field.glyphs.map((glyph) => glyph.y);
    expect(Math.min(...xs)).toBeLessThan(VEIL_CELL);
    expect(Math.max(...xs)).toBeGreaterThan(LAYOUT.width - VEIL_CELL);
    expect(Math.min(...ys)).toBeLessThan(VEIL_CELL);
    expect(Math.max(...ys)).toBeGreaterThan(LAYOUT.height - VEIL_CELL);

    for (const glyph of field.glyphs) {
      expect(Array.from(glyph.char)).toHaveLength(1);
      expect(glyph.char).toMatch(/^[\x20-\x7E·]$/);
      expect(glyph.alpha).toBeGreaterThanOrEqual(VEIL_GLYPH_ALPHA_MIN);
      expect(glyph.alpha).toBeLessThanOrEqual(VEIL_GLYPH_ALPHA_MAX);
    }
  });

  it("does not fill every cell: a glyph field with holes reads as field, not as text", () => {
    const cells = (Math.floor(LAYOUT.width / VEIL_CELL) + 1) * (Math.floor(LAYOUT.height / VEIL_CELL) + 1);
    expect(field.glyphs.length).toBeLessThan(cells * 0.9);
    expect(field.glyphs.length).toBeGreaterThan(cells * 0.6);
  });

  it("is deterministic: the same layout produces the same field", () => {
    expect(createVeilField(LAYOUT)).toEqual(field);
  });

  it("drifts slowly and never leaves the viewport", () => {
    const frames = [0, 1, 7, 40].map((time) => veilFrame(field, { time, elapsed: 0 }));
    for (const frame of frames) {
      for (const glyph of frame.glyphs) {
        expect(glyph.x).toBeGreaterThan(-2 * VEIL_CELL);
        expect(glyph.x).toBeLessThan(LAYOUT.width + 2 * VEIL_CELL);
        expect(glyph.y).toBeGreaterThan(-2 * VEIL_CELL);
        expect(glyph.y).toBeLessThan(LAYOUT.height + 2 * VEIL_CELL);
      }
    }

    /* Deriva lenta: em um quarto de segundo nenhum glifo anda 2px. */
    const start = veilFrame(field, { time: 0, elapsed: 0 });
    const quarter = veilFrame(field, { time: 0.25, elapsed: 250 });
    const walk = start.glyphs.map((glyph, index) =>
      Math.hypot(glyph.x - quarter.glyphs[index].x, glyph.y - quarter.glyphs[index].y),
    );
    expect(Math.max(...walk)).toBeLessThan(2);
    expect(Math.max(...walk)).toBeGreaterThan(0);
  });

  it("keeps three drifting glows inside the viewport", () => {
    expect(field.glows).toHaveLength(VEIL_GLOW_COUNT);

    const start = veilFrame(field, { time: 0, elapsed: 0 });
    const later = veilFrame(field, { time: 30, elapsed: 30_000 });
    for (const glow of start.glows) {
      expect(glow.radius).toBeGreaterThan(0);
      expect(glow.alpha).toBeGreaterThan(0);
      expect(glow.x).toBeGreaterThanOrEqual(0);
      expect(glow.x).toBeLessThanOrEqual(LAYOUT.width);
      expect(glow.y).toBeGreaterThanOrEqual(0);
      expect(glow.y).toBeLessThanOrEqual(LAYOUT.height);
    }

    const travel = start.glows.map((glow, index) =>
      Math.hypot(glow.x - later.glows[index].x, glow.y - later.glows[index].y),
    );
    expect(Math.max(...travel)).toBeGreaterThan(0);
    expect(Math.max(...travel)).toBeLessThan(30 * 40);
  });

  it("expands two concentric waves from the window center, once", () => {
    expect(field.rings).toHaveLength(VEIL_RING_COUNT);

    const atEntry = veilFrame(field, { time: 0, elapsed: 0 });
    expect(atEntry.rings).toHaveLength(0);

    const early = veilFrame(field, { time: 0.12, elapsed: 120 });
    expect(early.rings.length).toBeGreaterThanOrEqual(1);
    const middle = veilFrame(field, { time: 0.6, elapsed: 600 });
    expect(middle.rings).toHaveLength(VEIL_RING_COUNT);
    expect(middle.rings[0].radius).toBeGreaterThan(early.rings[0].radius);
    expect(middle.rings[0].alpha).toBeLessThan(early.rings[0].alpha);
    expect(middle.rings[1].radius).toBeLessThan(middle.rings[0].radius);

    for (const ring of middle.rings) {
      expect(ring.x).toBe(LAYOUT.origin.x);
      expect(ring.y).toBe(LAYOUT.origin.y);
      expect(ring.alpha).toBeGreaterThan(0);
    }

    /* Uma vez, nao em laco: passado o atraso + a duracao da ultima, nao sobra nada. */
    expect(veilFrame(field, { time: 4, elapsed: 4000 }).rings).toHaveLength(0);
  });

  it("lets the first wave die before the second: staggered, not a loop", () => {
    const frame = veilFrame(field, { time: 1.25, elapsed: 1250 });
    expect(frame.rings).toHaveLength(1);
    expect(frame.rings[0].radius).toBeGreaterThan(veilFrame(field, { time: 0.6, elapsed: 600 }).rings[1].radius);
  });

  it("stays still when time does not advance: the reduced-motion frame", () => {
    const still = veilFrame(field, { time: 0, elapsed: 0 });
    expect(veilFrame(field, { time: 0, elapsed: 0 })).toEqual(still);
    /* O `elapsed` move as ondas; o tempo congelado nao move nada. */
    expect(veilFrame(field, { time: 0, elapsed: 8000 })).toEqual(still);
    expect(still.rings).toHaveLength(0);
    expect(still.glyphs).toHaveLength(field.glyphs.length);
  });
});
