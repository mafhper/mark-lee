import { ZenMotionTokens } from "@/aurora/zen-tokens";
import type { RecordTheme } from "@/aurora/theme-tokens";

/**
 * A cor do wash de areia, derivada do tema que o palco está mostrando.
 *
 * O jardim é o mesmo desenho em todas as visitas — mesmo espaçamento de crista,
 * mesma frente de cobertura, mesma geometria. O que muda é a **luz**: o papel do
 * véu e a areia das cristas recebem o matiz do tema ativo. Midnight banha o
 * campo de azul-acinzentado, Sepia de âmbar, Forest de verde.
 *
 * 1. **Só o matiz vem do tema.** A claridade de cada superfície é a da base, e a
 *    croma é fixa. Misturar o acento inteiro (claridade inclusive) fazia o papel
 *    despencar nos temas de acento escuro — Golden caía para ~0,27 de luminância,
 *    o que não é papel tingido, é papel pintado. Papel continua papel; o que a
 *    visita decide é a cor da luz.
 * 2. **A conta é a mesma do `color-mix(in oklab, …)`.** O carrinho existente do
 *    site (`fadeToken`, `alphaToken`) mistura em oklab; aqui a conversão é
 *    explícita porque o shader precisa de três números, não de uma função CSS.
 *    Os valores batem byte a byte com o que o navegador resolve para
 *    `oklch(from <acento> <L> <croma> h)` — o teste guarda os literais.
 * 3. **A tinta continua clara.** A claridade do papel é a da areia base
 *    (`ZenMotionTokens.colors.paperRgb`, luminância 0,637); o pico composto
 *    fica no mesmo patamar de antes em todos os doze temas.
 */

/** Um canal RGB, 0–255, como o shader recebe. */
export type WashRgb = readonly [number, number, number];

/** O que o motor desenha: o papel do véu e a areia das cristas. */
export interface StageWash {
  ink: WashRgb;
  sand: WashRgb;
}

/**
 * A croma de cada superfície, em oklab.
 *
 * O papel é quase neutro de propósito — 0,06 é papel tingido, não papel
 * colorido. A areia carrega mais (0,12): é ela que dá a cor do jardim, e o
 * shader só a mostra nas cristas iluminadas (`ridgeTint`).
 */
export const STAGE_WASH = {
  inkChroma: 0.06,
  sandChroma: 0.12,
} as const;

const srgbToLinear = (value: number) =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const linearToSrgb = (value: number) =>
  value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;

/** `#rrggbb` → canais 0–255. */
export function hexToRgb(hex: string): WashRgb {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

/** Oklab de Björn Ottosson: sRGB → LMS cúbico → eixos de claridade/croma. */
function toOklab([r, g, b]: WashRgb): WashRgb {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([lightness, a, b]: WashRgb): WashRgb {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  const channel = (value: number) => Math.round(Math.min(Math.max(linearToSrgb(value), 0), 1) * 255);
  return [channel(channels[0]), channel(channels[1]), channel(channels[2])];
}

/**
 * A base com o matiz do acento e uma croma fixa.
 *
 * `atan2` em oklab é o ângulo de matiz do `oklch`; tomar só ele é o que mantém
 * a claridade da base. A croma entra como constante porque o acento de um tema
 * escuro tem croma alta e claridade baixa — copiar a croma dele escureceria o
 * papel pelo mesmo motivo que copiar a claridade.
 */
function tint(base: WashRgb, accent: WashRgb, chroma: number): WashRgb {
  const accentLab = toOklab(accent);
  const baseLab = toOklab(base);
  const hue = Math.atan2(accentLab[2], accentLab[1]);
  return fromOklab([baseLab[0], chroma * Math.cos(hue), chroma * Math.sin(hue)]);
}

/** O wash do tema: papel e areia com o matiz dele. */
export function stageWashOf(theme: Pick<RecordTheme, "accentHex">): StageWash {
  const accent = hexToRgb(theme.accentHex);
  return {
    ink: tint(ZenMotionTokens.colors.paperRgb, accent, STAGE_WASH.inkChroma),
    sand: tint(ZenMotionTokens.colors.sandRgb, accent, STAGE_WASH.sandChroma),
  };
}

/** Interpolação linear de dois washes, canal a canal (o `t` já vem suavizado). */
export function blendWash(from: StageWash, to: StageWash, t: number): StageWash {
  const clamped = Math.min(Math.max(t, 0), 1);
  const channel = (a: number, b: number) => Math.round(a + (b - a) * clamped);
  return {
    ink: [channel(from.ink[0], to.ink[0]), channel(from.ink[1], to.ink[1]), channel(from.ink[2], to.ink[2])],
    sand: [
      channel(from.sand[0], to.sand[0]),
      channel(from.sand[1], to.sand[1]),
      channel(from.sand[2], to.sand[2]),
    ],
  };
}
