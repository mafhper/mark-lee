import { describe, expect, it } from "vitest";
import { ORDERED_THEMES, RECORD_THEMES } from "@/aurora/theme-tokens";
import { blendWash, hexToRgb, stageWashOf, type WashRgb } from "@/aurora/stage-wash";

/**
 * O jardim tingido pelo tema.
 *
 * O que este teste protege é a decisão de desenho, não a implementação da
 * conversão: a tinta continua clara, os três temas da prova ficam visivelmente
 * diferentes entre si, e o pico composto não passa do teto da ficha.
 *
 * Os valores esperados de Midnight, Sepia e Forest não saem desta conta: saem do
 * navegador, que resolve `oklch(from <acento> <claridade> <croma> h)` para sRGB.
 * É o oráculo independente da conversão oklab do módulo.
 */

const theme = (id: string) => {
  const found = RECORD_THEMES.find((item) => item.id === id);
  if (!found) throw new Error(`tema ausente: ${id}`);
  return found;
};

const luminance = ([r, g, b]: WashRgb) => {
  const channel = (value: number) =>
    value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const distance = (a: WashRgb, b: WashRgb) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const BASE_PAPER = [218, 208, 190] as const;

/**
 * O pico composto do shader, na conta que ele desenha.
 *
 * `carve` é o relevo (aqui no máximo, para pegar o pior caso), `u_washAlpha` é a
 * opacidade de pico do véu e o fundo é o palco escuro — é sobre ele que o campo
 * claro aparece. A luminância é a WCAG, a mesma que a ficha de aceite cita.
 */
function peakLuminance(ink: WashRgb, sand: WashRgb, backdrop: WashRgb): number {
  let peak = 0;

  for (let depth = 0.5; depth < 1200; depth += 0.5) {
    const falloff = Math.exp(-((depth / 360) ** 2));
    const lift = 0.16 * Math.max(falloff, 0);
    const gain = 1 + falloff * 0.13;
    const color = [0, 1, 2].map((index) =>
      Math.min(255, (ink[index] + (sand[index] - ink[index]) * lift) * gain),
    ) as unknown as WashRgb;
    const alpha = Math.min(1, (1 - Math.exp(-depth / 80)) * 0.78);
    const out = [0, 1, 2].map((index) =>
      color[index] * alpha + backdrop[index] * (1 - alpha),
    ) as unknown as WashRgb;
    peak = Math.max(peak, luminance(out));
  }

  return peak;
}

describe("wash do palco", () => {
  it("takes the theme's hue at the paper's own lightness", () => {
    /* Literais do navegador — não recalculados aqui. */
    expect(stageWashOf(theme("midnight")).ink).toEqual([189, 210, 250]);
    expect(stageWashOf(theme("sepia")).ink).toEqual([233, 204, 166]);
    expect(stageWashOf(theme("forest")).ink).toEqual([182, 221, 189]);
    expect(stageWashOf(theme("midnight")).sand).toEqual([118, 156, 232]);
    expect(stageWashOf(theme("sepia")).sand).toEqual([202, 145, 62]);
    expect(stageWashOf(theme("forest")).sand).toEqual([96, 179, 118]);
    expect(hexToRgb("#8fb5ff")).toEqual([143, 181, 255]);
  });

  it("baths midnight, sepia and forest in visibly different inks", () => {
    /* A prova visual são as capturas; aqui fica o piso numérico: três tintas
     * que o olho separa têm de estar longe também em RGB. */
    const midnight = stageWashOf(theme("midnight")).ink;
    const sepia = stageWashOf(theme("sepia")).ink;
    const forest = stageWashOf(theme("forest")).ink;

    expect(distance(midnight, sepia)).toBeGreaterThan(40);
    expect(distance(midnight, forest)).toBeGreaterThan(40);
    expect(distance(sepia, forest)).toBeGreaterThan(40);
  });

  it("keeps the ink as light as the base paper in every theme", () => {
    const base = luminance(BASE_PAPER);
    for (const item of RECORD_THEMES) {
      const wash = stageWashOf(item);
      /* A croma entra, a claridade não: nenhum tema clareia nem escurece o
       * papel além do ruído da rotação de matiz. */
      expect(luminance(wash.ink), item.id).toBeLessThanOrEqual(base + 0.02);
      expect(luminance(wash.ink), item.id).toBeGreaterThanOrEqual(base - 0.03);
    }
  });

  it("keeps the peak under 0.8 in every theme", () => {
    /* A ficha de aceite: o pico composto do véu fica abaixo de 0,8 em todos os
     * doze. O fundo é o palco escuro, onde o campo claro de fato aparece. */
    for (const item of ORDERED_THEMES) {
      const wash = stageWashOf(item);
      expect(peakLuminance(wash.ink, wash.sand, [22, 30, 28]), item.id).toBeLessThan(0.8);
    }
  });

  it("tints every theme away from the neutral paper", () => {
    for (const item of RECORD_THEMES) {
      const wash = stageWashOf(item);
      expect(distance(wash.ink, BASE_PAPER), item.id).toBeGreaterThan(15);
    }
  });

  it("blends between two washes and settles on the endpoints", () => {
    const from = stageWashOf(theme("midnight"));
    const to = stageWashOf(theme("sepia"));

    expect(blendWash(from, to, 0)).toEqual(from);
    expect(blendWash(from, to, 1)).toEqual(to);
    expect(blendWash(from, to, 0.5).ink).toEqual([211, 207, 208]);
    /* Fora de [0,1] satura nos extremos em vez de extrapolar. */
    expect(blendWash(from, to, -1)).toEqual(from);
    expect(blendWash(from, to, 2)).toEqual(to);
  });
});
