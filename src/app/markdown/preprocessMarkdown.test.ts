import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { preprocessMarkdown } from "./preprocessMarkdown.ts";

function isTag(input: string): boolean {
  return preprocessMarkdown(input).includes('class="ml-preview-tag"');
}

describe("preprocessMarkdown · normalizeTags", () => {
  it("reconhece uma hashtag com letras como tag", () => {
    const out = preprocessMarkdown("Um dia de #natureza e calma");
    assert.match(out, /class="ml-preview-tag" data-tag="natureza"/);
    assert.match(out, />#natureza</);
  });

  it("reconhece tags com acento e dígitos", () => {
    assert.equal(isTag("#viagem2024"), true);
    assert.equal(isTag("#café"), true);
    assert.equal(isTag("#não_sei"), true);
  });

  it("NÃO transforma números puros em tag (#42, #1234, #10)", () => {
    assert.equal(isTag("Bug #42 na issue #1234"), false);
    assert.equal(isTag("Preço #10 reais"), false);
  });

  it("NÃO transforma cores hex em tag (#fff, #1d4ed8)", () => {
    assert.equal(isTag("cor de fundo #fff e texto #1d4ed8"), false);
    assert.equal(isTag("#abcd e #11223344"), false); // 4 e 8 dígitos hex
  });

  it("preserva o texto literal quando não é tag", () => {
    const out = preprocessMarkdown("cor #fff aqui");
    assert.match(out, /#fff/);
    assert.doesNotMatch(out, /ml-preview-tag/);
  });

  it("não cria tag a partir de âncora de URL (precedida por letra)", () => {
    assert.equal(isTag("veja https://exemplo.com/pagina#secao"), false);
  });

  it("uma palavra hex-like mais longa ainda é tag (#faced, 5 dígitos)", () => {
    // 5 hex digits is not a valid CSS hex length, so a word like this stays a tag.
    assert.equal(isTag("#faced"), true);
  });
});
