import { describe, expect, it } from "vitest";
import { tokenize, type Segment } from "@/aurora/app-window-tokens";

const tons = (segments: Segment[]) => segments.map((segment) => segment.tone);

/**
 * O realce do documento como o aplicativo o faz — medido no app rodando, nao
 * deduzido.
 *
 * O front-matter e o caso que ja regrediu uma vez: o bloco saia pintado de
 * marcador (verde) porque ninguem tinha medido o que o CodeMirror do aplicativo
 * faz com ele. Medido, o app nao realca YAML nenhum: `---`, chave e valor saem
 * todos na cor do texto (tema Midnight: `rgb(238, 242, 255)`, peso 400), e o
 * unico trecho pintado dentro do bloco e o `-` da lista.
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

  it("mantem o titulo em duas partes: marcador e texto", () => {
    const [titulo] = tokenize(["## O que se ve a olho nu"]);

    expect(tons(titulo)).toEqual(["marker", "heading"]);
    expect(titulo[1].text).toBe(" O que se ve a olho nu");
  });

  it("mantem a imagem com marcador e endereco", () => {
    const [imagem] = tokenize(["![Nebulosa de Orion](imagens/nebulosa-orion.webp)"]);

    expect(tons(imagem)).toEqual(["marker", "plain", "marker", "link", "marker"]);
    expect(imagem[3].text).toBe("imagens/nebulosa-orion.webp");
  });

  it("trata a linha de separacao do corpo como texto, nao como marcador", () => {
    const linhas = tokenize(["Um paragrafo.", "", "---", "", "Anterior: [Caderno](caderno.md)"]);

    expect(linhas[2]).toEqual([{ text: "---", tone: "plain" }]);
    expect(linhas[4]).toEqual([{ text: "Anterior: [Caderno](caderno.md)", tone: "plain" }]);
  });
});
