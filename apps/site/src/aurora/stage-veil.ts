/**
 * Modelo do véu de concentração do palco.
 *
 * A ideia é de terceiros, a implementação é nossa: um campo de glifos mono com
 * brilhos à deriva e ondas concêntricas. Nada de código de referência entrou
 * aqui — o que este arquivo descreve é a geometria do efeito, sem canvas, sem
 * DOM e sem relógio, para poder ser medida e testada.
 *
 * Três decisões que valem para o desenho inteiro:
 *
 *  1. **Nada se move rápido.** A deriva é de ~1px/s e as ondas levam ~1,5s. O
 *     efeito é um véu, não um fogos de artifício: se piscar, distrai do que
 *     deveria isolar.
 *  2. **O campo é determinístico.** A posição de cada glifo nasce de um hash da
 *     própria célula, então o mesmo layout desenha o mesmo campo — dois quadros
 *     seguidos só diferem no que a deriva moveu.
 *  3. **Um quadro, um orçamento.** `veilFrame` devolve apenas o que o pintor
 *     precisa (posições, alfas, raios). Quem desenha não decide nada.
 */

/** Passo da grade, em px de CSS. Arredondado para caber um número inteiro de colunas. */
export const VEIL_CELL = 64;

/** Opacidade dos glifos: baixa de propósito. Acima de 0,12 o campo vira texto. */
export const VEIL_GLYPH_ALPHA_MIN = 0.06;
export const VEIL_GLYPH_ALPHA_MAX = 0.12;

/** Brilhos e ondas: os números são a especificação do efeito. */
export const VEIL_GLOW_COUNT = 3;
export const VEIL_RING_COUNT = 2;

/** Amplitude da deriva, em px. O glifo passeia, não viaja. */
const VEIL_DRIFT = 7;

/** Velocidade angular da deriva, em rad/s (~35s por ciclo). */
const VEIL_DRIFT_SPEED = 0.18;

/**
 * O alfabeto do campo: pontuação e operadores de uma fonte mono. Nada de letras
 * — letra solta o olho tenta ler, e um véu não se lê.
 */
const VEIL_GLYPHS = [
  "·", ".", ",", ":", ";", "'", '"', "+", "-", "=", "|", "/", "\\", "<", ">", "~", "^", "*", "#", "%", "&", "_", "!", "?",
];

/** Fração de células vazias: o campo respira e não vira textura. */
const VEIL_EMPTY = 0.2;

/**
 * Brilhos radiais. `x`, `y` e `radius` são frações da viewport; `drift` é a
 * amplitude da deriva, também em fração. `tone` só escolhe a cor no pintor.
 */
const VEIL_GLOWS = [
  { x: 0.26, y: 0.3, radius: 0.5, alpha: 0.15, drift: 0.05, speed: 0.05, phase: 0.4, tone: "accent" as const },
  { x: 0.74, y: 0.62, radius: 0.4, alpha: 0.09, drift: 0.045, speed: 0.041, phase: 2.2, tone: "light" as const },
  { x: 0.52, y: 0.86, radius: 0.32, alpha: 0.07, drift: 0.04, speed: 0.058, phase: 4.1, tone: "accent" as const },
];

/**
 * Ondas concêntricas. A segunda nasce 240ms depois da primeira e vive mais:
 * duas frentes escalonadas leem como uma onda, não como um pulso repetido.
 * Passado `delay + duration`, a onda some e não volta — o efeito acontece uma
 * vez por entrada, nunca em laço.
 */
const VEIL_RINGS = [
  { delay: 0, duration: 1150, width: 2, alpha: 0.22 },
  { delay: 240, duration: 1560, width: 1.4, alpha: 0.16 },
];

export interface VeilPoint {
  x: number;
  y: number;
}

export interface VeilLayout {
  /** Largura da viewport, em px de CSS. */
  width: number;
  /** Altura da viewport, em px de CSS. */
  height: number;
  /** Centro da janela do palco — de onde as ondas saem. */
  origin: VeilPoint;
}

export interface VeilGlyphSeed {
  x: number;
  y: number;
  char: string;
  alpha: number;
  phase: number;
}

export interface VeilGlowSeed {
  /** Centro base, em px. */
  x: number;
  y: number;
  radius: number;
  alpha: number;
  driftX: number;
  driftY: number;
  speed: number;
  phase: number;
  tone: "accent" | "light";
}

export interface VeilRingSeed {
  delay: number;
  duration: number;
  width: number;
  alpha: number;
  maxRadius: number;
}

export interface VeilField {
  width: number;
  height: number;
  origin: VeilPoint;
  glyphs: VeilGlyphSeed[];
  glows: VeilGlowSeed[];
  rings: VeilRingSeed[];
}

export interface VeilGlyph {
  x: number;
  y: number;
  char: string;
  alpha: number;
}

export interface VeilGlow {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  tone: "accent" | "light";
}

export interface VeilRing {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  width: number;
}

export interface VeilFrame {
  width: number;
  height: number;
  glyphs: VeilGlyph[];
  glows: VeilGlow[];
  rings: VeilRing[];
}

export interface VeilTime {
  /** Segundos desde a entrada no palco: move a deriva. */
  time: number;
  /** Milissegundos desde a entrada: move as ondas, que acontecem uma vez. */
  elapsed: number;
}

/**
 * Hash estável por célula. `Math.imul` mantém tudo em 32 bits — sem ele o
 * `*` estoura a precisão do double e o campo muda entre navegadores.
 */
function hash(column: number, row: number, salt: number): number {
  let value = Math.imul(column + 1, 0x27d4eb2d) ^ Math.imul(row + 1, 0x165667b1) ^ Math.imul(salt, 0x9e3779b1);
  value ^= value >>> 15;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;
  return (value >>> 0) / 4_294_967_296;
}

/**
 * Monta o campo para um layout. Chamado uma vez por medida da viewport — não
 * por quadro. O centro das ondas vem de fora porque é a janela que manda: o
 * primeiro anel nasce no meio dela, não no meio da tela.
 */
export function createVeilField(layout: VeilLayout): VeilField {
  const columns = Math.max(8, Math.round(layout.width / VEIL_CELL));
  const rows = Math.max(6, Math.round(layout.height / VEIL_CELL));
  const stepX = layout.width / columns;
  const stepY = layout.height / rows;

  const glyphs: VeilGlyphSeed[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (hash(column, row, 1) < VEIL_EMPTY) continue;

      glyphs.push({
        /* Centro da célula com até ±8px de folga: grade, não tabela. */
        x: (column + 0.5) * stepX + (hash(column, row, 2) - 0.5) * 16,
        y: (row + 0.5) * stepY + (hash(column, row, 3) - 0.5) * 16,
        char: VEIL_GLYPHS[Math.floor(hash(column, row, 4) * VEIL_GLYPHS.length) % VEIL_GLYPHS.length],
        alpha: VEIL_GLYPH_ALPHA_MIN + hash(column, row, 5) * (VEIL_GLYPH_ALPHA_MAX - VEIL_GLYPH_ALPHA_MIN),
        /* A fase carrega a posição: vizinhos se movem juntos, como campo. */
        phase: column * 0.22 + row * 0.13 + hash(column, row, 6) * 0.9,
      });
    }
  }

  const glows: VeilGlowSeed[] = VEIL_GLOWS.map((glow) => {
    const ratio = Math.min(layout.width, layout.height);
    return {
      x: layout.width * glow.x,
      y: layout.height * glow.y,
      radius: ratio * glow.radius,
      alpha: glow.alpha,
      driftX: layout.width * glow.drift,
      driftY: layout.height * glow.drift,
      speed: glow.speed,
      phase: glow.phase,
      tone: glow.tone,
    };
  });

  /* A maior distância da janela até um canto: a onda morre depois de alcançar
   *  a viewport inteira, e não antes. */
  const corners = [
    Math.hypot(layout.origin.x, layout.origin.y),
    Math.hypot(layout.width - layout.origin.x, layout.origin.y),
    Math.hypot(layout.origin.x, layout.height - layout.origin.y),
    Math.hypot(layout.width - layout.origin.x, layout.height - layout.origin.y),
  ];

  const rings: VeilRingSeed[] = VEIL_RINGS.map((ring) => ({
    ...ring,
    maxRadius: Math.max(...corners),
  }));

  return {
    width: layout.width,
    height: layout.height,
    origin: { ...layout.origin },
    glyphs,
    glows,
    rings,
  };
}

/**
 * O quadro em um instante. Barato de propósito: sem DOM, sem `Math.random`,
 * sem estado escondido. `time` congelado devolve sempre o mesmo quadro — é o
 * que o modo de movimento reduzido usa.
 */
export function veilFrame(field: VeilField, { time, elapsed }: VeilTime): VeilFrame {
  const glyphs = field.glyphs.map((glyph) => {
    const phase = glyph.phase + time * VEIL_DRIFT_SPEED;
    return {
      x: glyph.x + Math.sin(phase) * VEIL_DRIFT,
      y: glyph.y + Math.cos(phase * 0.8) * VEIL_DRIFT * 0.72,
      char: glyph.char,
      alpha: glyph.alpha,
    };
  });

  const glows = field.glows.map((glow) => {
    const phase = glow.phase + time * glow.speed;
    return {
      x: glow.x + Math.sin(phase) * glow.driftX,
      y: glow.y + Math.cos(phase * 1.15) * glow.driftY,
      radius: glow.radius,
      alpha: glow.alpha,
      tone: glow.tone,
    };
  });

  const rings: VeilRing[] = [];
  for (const ring of field.rings) {
    const local = elapsed - ring.delay;
    if (local <= 0 || local >= ring.duration) continue;

    const progress = local / ring.duration;
    /* Freia no fim: a frente perde velocidade em vez de bater na borda. */
    const eased = 1 - Math.pow(1 - progress, 2.2);
    rings.push({
      x: field.origin.x,
      y: field.origin.y,
      radius: 24 + (ring.maxRadius - 24) * eased,
      alpha: ring.alpha * Math.pow(1 - progress, 1.2),
      width: ring.width,
    });
  }

  return { width: field.width, height: field.height, glyphs, glows, rings };
}
