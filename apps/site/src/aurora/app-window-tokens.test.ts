import { describe, expect, it } from "vitest";
import { RECORD_THEMES } from "@/aurora/theme-tokens";
import { foldableLines, paletteOf, segmentStyle, tokenize, tokenPalette, type Segment } from "@/aurora/app-window-tokens";

const tons = (segments: Segment[]) => segments.map((segment) => segment.tone);

const tema = (id: string) => {
  const encontrado = RECORD_THEMES.find((theme) => theme.id === id);
  if (!encontrado) throw new Error(`tema ${id} nao existe`);
  return paletteOf(encontrado);
};

/**
 * O realce do documento como o aplicativo o faz — medido no app rodando, nao
 * deduzido. Tema Midnight (`viewMode: "edit"`, 1440x900).
 *
 * O front-matter e o caso que ja regrediu uma vez: o bloco saia pintado de
 * marcador (verde) porque ninguem tinha medido o que o CodeMirror do aplicativo
 * faz com ele. Medido, o app nao realca YAML nenhum: `---`, chave e valor saem
 * todos na cor do texto (tema Midnight: `rgb(238, 242, 255)`, peso 400), e o
 * unico trecho pintado dentro do bloco e o `-` da lista.
 *
 * As decoracoes saem do mesmo arquivo de medicao, trecho por trecho:
 *
 *   `# Nebulosa` ...... `#` verde peso 700; texto `rgb(224, 108, 117)` peso 700,
 *                        `text-decoration: none` no escuro e `underline` no claro
 *   `*...*` ........... italico nos tres trechos, inclusive os asteriscos
 *   `![...](...)` ..... sublinhado nos seis trechos; texto alternativo na cor do
 *                        link (`rgb(125, 135, 153)`), nao na cor do texto
 *   ` [x](y)` ......... mesmo recorte do link, com o texto antes e depois neutro
 *   `- item` .......... verde so no marcador
 */
describe("realce do documento", () => {
  it("nao pinta o delimitador nem a chave do front-matter", () => {
    const linhas = tokenize(["---", "schema: marklee-entry", "title: Nebulosa de Orion", "---", ""]);

    expect(linhas[0]).toEqual([{ text: "---", tone: "plain" }]);
    expect(linhas[1]).toEqual([{ text: "schema: marklee-entry", tone: "plain" }]);
    expect(linhas[2]).toEqual([{ text: "title: Nebulosa de Orion", tone: "plain" }]);
    expect(linhas[3]).toEqual([{ text: "---", tone: "plain" }]);
  });

  it("pinta o marcador da lista dentro do front-matter, e so ele", () => {
    const linhas = tokenize(["---", "tags:", "  - ceu-profundo", "---"]);

    expect(linhas[2]).toEqual([
      { text: "  - ", tone: "marker" },
      { text: "ceu-profundo", tone: "plain" },
    ]);
  });

  it("pinta o marcador da lista no corpo tambem", () => {
    const [item] = tokenize(["- Binoculo 10x50 resolve o Trapezio"]);

    expect(tons(item)).toEqual(["marker", "plain"]);
    expect(item[0].text).toBe("- ");
  });

  it("mantem o titulo em duas partes: marcador e texto", () => {
    const [titulo] = tokenize(["## O que se ve a olho nu"]);

    expect(tons(titulo)).toEqual(["headingMarker", "heading"]);
    expect(titulo[1].text).toBe(" O que se ve a olho nu");
  });

  it("nao sublinha o titulo no tema escuro e sublinha no claro", () => {
    const [titulo] = tokenize(["## O que se ve a olho nu"]);
    const escuro = segmentStyle("heading", tokenPalette(tema("midnight")));
    const claro = segmentStyle("heading", tokenPalette(tema("golden")));

    expect(escuro.textDecoration).toBe("none");
    expect(claro.textDecoration).toBe("underline");
    expect(segmentStyle(titulo[0].tone, tokenPalette(tema("midnight"))).fontWeight).toBe(700);
  });

  it("inclina o trecho de enfase inteiro, asteriscos inclusive", () => {
    const [citacao] = tokenize(["*Legenda da imagem, credito e dominio publico.*"]);

    expect(tons(citacao)).toEqual(["emphasisMarker", "emphasis", "emphasisMarker"]);
    const tokens = tokenPalette(tema("midnight"));
    for (const segment of citacao) expect(segmentStyle(segment.tone, tokens).fontStyle).toBe("italic");
  });

  it("sublinha a imagem inteira, com o texto alternativo na cor do link", () => {
    const [imagem] = tokenize(["![Nebulosa de Orion](imagens/nebulosa-orion.webp)"]);

    expect(tons(imagem)).toEqual(["linkMarker", "link", "linkMarker", "link", "linkMarker"]);
    expect(imagem[3].text).toBe("imagens/nebulosa-orion.webp");

    const tokens = tokenPalette(tema("midnight"));
    for (const segment of imagem) expect(segmentStyle(segment.tone, tokens).textDecoration).toBe("underline");
    expect(segmentStyle(imagem[1].tone, tokens).color).toBe(tokens.link);
  });

  it("trata a linha de separacao do corpo como texto, nao como marcador", () => {
    const linhas = tokenize(["Um paragrafo.", "", "---", "", "Sem link aqui."]);

    expect(linhas[2]).toEqual([{ text: "---", tone: "plain" }]);
    expect(linhas[4]).toEqual([{ text: "Sem link aqui.", tone: "plain" }]);
  });

  it("recorta o link no meio da linha como o app: texto neutro em volta", () => {
    const linhas = tokenize(["Anterior: [Caderno](caderno.md) e fim."]);

    expect(linhas[0]).toEqual([
      { text: "Anterior: ", tone: "plain" },
      { text: "[", tone: "linkMarker" },
      { text: "Caderno", tone: "link" },
      { text: "](", tone: "linkMarker" },
      { text: "caderno.md", tone: "link" },
      { text: ")", tone: "linkMarker" },
      { text: " e fim.", tone: "plain" },
    ]);
  });
});

/**
 * A coluna de dobra, com o conjunto que o app desenha.
 *
 * A fonte independente e a medicao do app rodando: no documento de 43 linhas
 * aberto em `viewMode: "edit"`, o CodeMirror marca exatamente as linhas 1
 * (titulo), 3, 12, 14, 19, 21, 26, 33 e 35 — titulos e a primeira linha de cada
 * paragrafo de duas ou mais linhas. Nem o `---`, nem o fim de paragrafo, nem
 * item de lista.
 */
describe("coluna de dobra", () => {
  const documento = [
    "# Titulo", // 0
    "", // 1
    "Primeira linha do paragrafo", // 2
    "segunda linha do paragrafo", // 3
    "ultima linha do paragrafo", // 4
    "", // 5
    "- item de uma linha so", // 6
    "", // 7
    "## Secao", // 8
    "", // 9
    "---", // 10
    "", // 11
    "Uma linha sozinha", // 12
  ];

  it("marca titulos e o inicio de paragrafo de duas ou mais linhas", () => {
    const marcas = foldableLines(documento)
      .map((dobravel, index) => (dobravel ? index : -1))
      .filter((index) => index >= 0);

    expect(marcas).toEqual([0, 2, 8]);
  });

  it("nao marca o delimitador nem item de lista", () => {
    const marcas = foldableLines(documento);

    expect(marcas[10]).toBe(false);
    expect(marcas[6]).toBe(false);
    expect(marcas[3]).toBe(false);
  });

  it("num documento com front-matter, marca a primeira chave e nao o delimitador", () => {
    const marcas = foldableLines(["---", "schema: marklee-entry", "title: Nebulosa", "---", "", "# Titulo"]);

    expect(marcas).toEqual([false, true, false, false, false, true]);
  });
});
