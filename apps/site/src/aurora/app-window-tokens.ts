import type { CSSProperties } from "react";
import type { RecordTheme } from "@/aurora/theme-tokens";

/* ---------------------------------------------------------------------------
 * Tokens e realce de sintaxe da janela recriada.
 *
 * Fica separado do componente porque o site usa Fast Refresh, e um arquivo que
 * exporta componente **e** funcao perde o refresh. Nada aqui desenha: sao os
 * sete hex do tema virando paleta, e o Markdown virando trechos com tom.
 * ------------------------------------------------------------------------ */

/** `fg` com alfa: e assim que o app escreve `color-mix(..., transparent)`. */
export const alpha = (color: string, value: number) => `color-mix(in srgb, ${color} ${value * 100}%, transparent)`;

/** Mistura de dois tokens do tema, sem inventar cor. */
export const between = (color: string, base: string, weight: number) =>
  `color-mix(in srgb, ${color} ${weight}%, ${base})`;

export interface Palette {
  ui: string;
  bg: string;
  fg: string;
  border: string;
  editorBg: string;
  editorFg: string;
  accent: string;
  light: boolean;
}

export const paletteOf = (theme: RecordTheme): Palette => {
  const channels = [1, 3, 5].map((start) => parseInt(theme.bgHex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return {
    ui: theme.uiHex,
    bg: theme.bgHex,
    fg: theme.fgHex,
    border: theme.uiBorderHex,
    editorBg: theme.editorBgHex,
    editorFg: theme.editorFgHex,
    accent: theme.accentHex,
    light: 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35,
  };
};

/* ---------------------------------------------------------------------------
 * Realce de sintaxe
 *
 * Duas paletas, e nao doze: o editor do aplicativo usa o `defaultHighlightStyle`
 * do CodeMirror no tema claro e o do One Dark no escuro (`theme="light"|"dark"`
 * do `@uiw/react-codemirror`, decidido pela luminancia do fundo do editor).
 * Os valores foram lidos de `getComputedStyle` de cada `span` tokenizado nas duas
 * variantes (Golden => clara, Midnight => escura), nao copiados de documentacao.
 *
 * O que muda entre as duas — e por isso que o tom carrega `light`:
 *
 *   titulo ..... claro: sublinhado + negrito;  escuro: so negrito (sem decoracao)
 *   enfase ..... italico nos dois
 *   link ....... sublinhado nos dois; marcador em verde nos dois
 *
 * O front-matter NAO e excecao, e nao e inferido: o aplicativo nao tem realce de
 * YAML — o `---` de abertura e o de fechamento, a chave e o valor saem todos na
 * cor do texto, peso 400, sem decoracao. Medido no app rodando, com uma entrada
 * de Memorias aberta como documento (o unico documento do demo que tem
 * front-matter de verdade): no tema Midnight as tres sintaxes respondem
 * `rgb(238, 242, 255)` = `editorFg`. O unico trecho pintado dentro do bloco e o
 * `-` das listas, que o parser le como marcador de lista e pinta de verde.
 * ------------------------------------------------------------------------ */

export interface TokenPalette {
  marker: string;
  heading: string;
  link: string;
  quote: string;
  plain: string;
  /** Tema claro: o `defaultHighlightStyle` decora o titulo, o One Dark nao. */
  light: boolean;
}

export const tokenPalette = (palette: Palette): TokenPalette =>
  palette.light
    ? {
        marker: "#404740",
        heading: palette.editorFg,
        link: "#221199",
        quote: "#404740",
        plain: palette.editorFg,
        light: true,
      }
    : {
        marker: "#98c379",
        heading: "#e06c75",
        link: "#7d8799",
        quote: "#7d8799",
        plain: palette.editorFg,
        light: false,
      };

/**
 * Tons do realce.
 *
 * `headingMarker` existe porque no app o `#` do titulo herda o negrito do
 * titulo (medido: peso 700, cor do marcador) — um `marker` de peso 400 deixava
 * o `#` visivelmente mais leve que o texto ao lado. `linkMarker` e o mesmo
 * raciocinio para o sublinhado: no app **todo** o `[texto](url)` sai sublinhado,
 * inclusive os colchetes e os parenteses. `emphasis`/`emphasisMarker` carregam o
 * italico, que o app aplica ao trecho inteiro, asteriscos inclusive.
 */
export type Tone =
  | "plain"
  | "marker"
  | "headingMarker"
  | "heading"
  | "linkMarker"
  | "link"
  | "muted"
  | "emphasis"
  | "emphasisMarker";

export interface Segment {
  text: string;
  tone: Tone;
}

export const segmentStyle = (tone: Tone, tokens: TokenPalette): CSSProperties => {
  switch (tone) {
    case "marker":
      return { color: tokens.marker };
    case "headingMarker":
      return { color: tokens.marker, fontWeight: 700 };
    case "heading":
      return {
        color: tokens.heading,
        fontWeight: 700,
        textDecoration: tokens.light ? "underline" : "none",
      };
    case "linkMarker":
      return { color: tokens.marker, textDecoration: "underline" };
    case "link":
      return { color: tokens.link, textDecoration: "underline" };
    case "muted":
      return { color: tokens.quote };
    case "emphasis":
      return { color: tokens.plain, fontStyle: "italic" };
    case "emphasisMarker":
      return { color: tokens.marker, fontStyle: "italic" };
    default:
      return { color: tokens.plain };
  }
};

/** Um `[texto](destino)` dentro da linha, com o mesmo recorte do app. */
const LINK = /\[([^\]]*)\]\(([^)]*)\)/g;

const inlineTokens = (line: string): Segment[] | null => {
  const segments: Segment[] = [];
  let cursor = 0;
  let found = false;
  for (const match of line.matchAll(LINK)) {
    found = true;
    const start = match.index ?? 0;
    if (start > cursor) segments.push({ text: line.slice(cursor, start), tone: "plain" });
    segments.push(
      { text: "[", tone: "linkMarker" },
      { text: match[1], tone: "link" },
      { text: "](", tone: "linkMarker" },
      { text: match[2], tone: "link" },
      { text: ")", tone: "linkMarker" }
    );
    cursor = start + match[0].length;
  }
  if (!found) return null;
  if (cursor < line.length) segments.push({ text: line.slice(cursor), tone: "plain" });
  return segments;
};

/**
 * Quais linhas o editor do aplicativo trata como dobraveis.
 *
 * Medido no app com o documento aberto (modo `edit`, 1440x900): o chevron
 * aparece no titulo e na **primeira linha de cada paragrafo de duas ou mais
 * linhas** — nem no fim do paragrafo, nem nos itens de lista de uma linha so.
 * A regra abaixo reproduz exatamente esse conjunto (9 marcas nas 43 linhas do
 * documento medido, das quais 7 aparecem na area visivel).
 *
 * Duas excecoes tambem medidas: o delimitador `---` **nao** e dobravel, e num
 * documento com front-matter a marca fica na primeira chave, nao no `---` de
 * abertura (medido na entrada de Memorias aberta como documento: uma unica
 * marca, em `schema: marklee-entry`).
 */
export const foldableLines = (lines: string[]): boolean[] => {
  const delimita = (texto: string) => /^-{3,}\s*$/.test(texto);
  const abreFrontMatter = delimita((lines[0] ?? "").trim());
  return lines.map((texto, index) => {
    if (delimita(texto)) return false;
    if (/^#{1,6}\s/.test(texto)) return true;
    if (texto.trim().length === 0) return false;
    if (/^\s*[-*+]\s+/.test(texto)) return false;
    if (abreFrontMatter && index === 1) return true;
    const anterior = lines[index - 1] ?? "";
    const proximo = lines[index + 1] ?? "";
    /* Inicio de um bloco de paragrafo: a linha anterior e vazia (ou nao existe)
     * e a proxima tambem tem texto. */
    const inicio = anterior.trim().length === 0;
    return inicio && proximo.trim().length > 0;
  });
};

/** Le o Markdown do documento como o editor do app o pinta. */
export const tokenize = (lines: string[]): Segment[][] => {
  /* Sem `---` na primeira linha nao existe front-matter: o bloco neutro so vale
   * até o delimitador de fechamento. Antes, um documento sem front-matter
   * tratava o texto inteiro como se fosse YAML. */
  let frontMatterDone = lines[0] !== "---";
  return lines.map((line, index) => {
    /* O bloco `---` e neutro: o aplicativo nao realca YAML, entao o delimitador
     * e a chave ficam na cor do texto. Verde aqui era invencao — e mentia duas
     * vezes, porque pintava de marcador o que o app le como texto e porque
     * fazia a chave parecer um campo de destaque que o app nao tem. */
    if (line === "---") {
      if (index > 0) frontMatterDone = true;
      return [{ text: line, tone: "plain" }];
    }
    const heading = /^(#{1,6})(\s+.*)?$/.exec(line);
    if (heading) {
      return [
        { text: heading[1], tone: "headingMarker" },
        { text: heading[2] ?? "", tone: "heading" },
      ];
    }
    /* Marcador de lista: o app pinta so o `-` (e o espaco que o segue), tanto no
     * corpo quanto dentro do front-matter — onde `  - poesia` tambem e lido como
     * item de lista. */
    const bullet = /^(\s*[-*+]\s+)(.*)$/.exec(line);
    if (bullet) {
      return [
        { text: bullet[1], tone: "marker" },
        { text: bullet[2], tone: "plain" },
      ];
    }
    if (!frontMatterDone) return [{ text: line, tone: "plain" }];
    const image = /^(!\[)([^\]]*)(\]\()([^)]*)(\))$/.exec(line);
    if (image) {
      /* No app a linha inteira sai sublinhada, inclusive os colchetes e os
       * parenteses, e o texto alternativo tem a cor do link. */
      return [
        { text: image[1], tone: "linkMarker" },
        { text: image[2], tone: "link" },
        { text: image[3], tone: "linkMarker" },
        { text: image[4], tone: "link" },
        { text: image[5], tone: "linkMarker" },
      ];
    }
    const emphasis = /^(\*)(.+)(\*)$/.exec(line);
    if (emphasis) {
      /* O italico do app cobre o trecho inteiro: os asteriscos tambem sao
       * inclinados (medido: `font-style: italic` nos tres spans). */
      return [
        { text: emphasis[1], tone: "emphasisMarker" },
        { text: emphasis[2], tone: "emphasis" },
        { text: emphasis[3], tone: "emphasisMarker" },
      ];
    }
    const inline = inlineTokens(line);
    if (inline) return inline;
    return [{ text: line, tone: "plain" }];
  });
};
