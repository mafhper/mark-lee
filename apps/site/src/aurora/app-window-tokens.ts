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
 * do CodeMirror, que tem uma variante clara e uma escura, escolhidas pelo tema.
 * Os valores foram lidos de `getComputedStyle` de cada `span` tokenizado nas duas
 * variantes (Golden => clara, Midnight => escura), nao copiados de documentacao.
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
}

export const tokenPalette = (palette: Palette): TokenPalette =>
  palette.light
    ? { marker: "#404740", heading: palette.editorFg, link: "#221199", quote: "#404740", plain: palette.editorFg }
    : { marker: "#98c379", heading: "#e06c75", link: "#7d8799", quote: "#7d8799", plain: palette.editorFg };

export type Tone = "plain" | "marker" | "heading" | "link" | "muted";

export interface Segment {
  text: string;
  tone: Tone;
}

export const segmentStyle = (tone: Tone, tokens: TokenPalette): CSSProperties => {
  switch (tone) {
    case "marker":
      return { color: tokens.marker };
    case "heading":
      return { color: tokens.heading, fontWeight: 700, textDecoration: "underline" };
    case "link":
      return { color: tokens.link, textDecoration: "underline" };
    case "muted":
      return { color: tokens.quote };
    default:
      return { color: tokens.plain };
  }
};

/** Le o Markdown do documento como o editor do app o pinta. */
export const tokenize = (lines: string[]): Segment[][] => {
  let frontMatterDone = false;
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
        { text: heading[1], tone: "marker" },
        { text: heading[2] ?? "", tone: "heading" },
      ];
    }
    if (!frontMatterDone) {
      /* Dentro do front-matter a unica coisa pintada e o `-` da lista: o parser
       * do app le `  - poesia` como item de lista e colore so o marcador. */
      const bullet = /^(\s*-\s+)(.*)$/.exec(line);
      if (bullet) {
        return [
          { text: bullet[1], tone: "marker" },
          { text: bullet[2], tone: "plain" },
        ];
      }
    }
    const image = /^(!?\[)([^\]]*)(\]\()([^)]*)(\))$/.exec(line);
    if (image) {
      return [
        { text: image[1], tone: "marker" },
        { text: image[2], tone: "plain" },
        { text: image[3], tone: "marker" },
        { text: image[4], tone: "link" },
        { text: image[5], tone: "marker" },
      ];
    }
    const emphasis = /^(\*)(.+)(\*)$/.exec(line);
    if (emphasis) {
      return [
        { text: emphasis[1], tone: "marker" },
        { text: emphasis[2], tone: "plain" },
        { text: emphasis[3], tone: "marker" },
      ];
    }
    return [{ text: line, tone: "plain" }];
  });
};
