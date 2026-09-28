import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveLocalImagePath, isRemoteImagePath } from "./imagePath.ts";

const DOC = "C:/Users/mafhper/Documents/Github/mark-lee/README.md";

describe("resolveLocalImagePath - guarda de caminho local", () => {
  it("rejeita caminho relativo quando o documento nao tem pasta (Untitled)", () => {
    // Este era o vazamento: o src cru ia para o <img> e a origem da aplicacao
    // resolvia o caminho, servindo a arvore do projeto.
    assert.equal(resolveLocalImagePath("docs/images/releases/release.webp", null), null);
    assert.equal(resolveLocalImagePath("docs/images/releases/release.webp", undefined), null);
  });

  it("rejeita escape de diretorio com ..", () => {
    assert.equal(resolveLocalImagePath("../../../../Windows/win.ini", DOC), null);
    assert.equal(resolveLocalImagePath("img/../../../segredo.png", DOC), null);
  });

  it("rejeita esquema e protocolo-relativo", () => {
    assert.equal(resolveLocalImagePath("javascript:alert(1)", DOC), null);
    assert.equal(resolveLocalImagePath("data:image/png;base64,AAAA", DOC), null);
    assert.equal(resolveLocalImagePath("//evil.example/x.png", DOC), null);
  });

  it("rejeita src vazio ou so com separadores", () => {
    assert.equal(resolveLocalImagePath("", DOC), null);
    assert.equal(resolveLocalImagePath("   ", DOC), null);
    assert.equal(resolveLocalImagePath("./", DOC), null);
  });

  it("rejeita relativo quando o documento nao tem diretorio", () => {
    assert.equal(resolveLocalImagePath("a.png", "README.md"), null);
  });

  it("resolve relativo contra a pasta do documento", () => {
    assert.equal(
      resolveLocalImagePath("docs/images/releases/release.webp", DOC),
      "C:/Users/mafhper/Documents/Github/mark-lee/docs/images/releases/release.webp",
    );
  });

  it("resolve relativo com caminho Windows do documento", () => {
    assert.equal(
      resolveLocalImagePath("banner.webp", "C:\\proj\\docs\\README.md"),
      "C:\\proj\\docs/banner.webp",
    );
  });

  it("preserva caminho absoluto - funcionalidade existente", () => {
    assert.equal(resolveLocalImagePath("C:/fotos/img.png", DOC), "C:/fotos/img.png");
    assert.equal(resolveLocalImagePath("/usr/share/img.png", DOC), "/usr/share/img.png");
  });
});

describe("isRemoteImagePath - classificacao unica", () => {
  it("reconhece http, https e data", () => {
    assert.equal(isRemoteImagePath("http://ex.com/a.png"), true);
    assert.equal(isRemoteImagePath("https://ex.com/a.png"), true);
    assert.equal(isRemoteImagePath("data:image/png;base64,AAA"), true);
  });

  it("NÃO classifica protocolo-relativo como remoto", () => {
    // Era o buraco: `//host/x` casava o ramo remoto, o componente ia direto para
    // a rede e a guarda de caminho nunca era consultada.
    assert.equal(isRemoteImagePath("//evil.example/x.png"), false);
    assert.equal(isRemoteImagePath("  //evil.example/x.png"), false);
  });

  it("NÃO classifica caminho local como remoto", () => {
    assert.equal(isRemoteImagePath("docs/a.png"), false);
    assert.equal(isRemoteImagePath("C:/fotos/a.png"), false);
    assert.equal(isRemoteImagePath("/usr/share/a.png"), false);
  });

  it("protocolo-relativo cai na guarda de caminho e vira null", () => {
    // Fechamento do ciclo: nao e remoto, e a guarda tambem recusa.
    assert.equal(resolveLocalImagePath("//evil.example/x.png", DOC), null);
    assert.equal(resolveLocalImagePath("//evil.example/x.png", null), null);
  });
});

describe("MarkdownImage.tsx - o fonte obeyece a guarda", () => {
  const src = readFileSync(
    new URL("./MarkdownImage.tsx", import.meta.url),
    "utf8",
  );

  it("nao deixa o caminho relativo cru chegar ao <img> no navegador", () => {
    // A forma do bug era `isRemoteImage(originalSrc) || !isTauriRuntime()` =>
    // src cru. A origem da pagina resolvia o relativo sozinha.
    assert.ok(
      !/isRemoteImage\(originalSrc\)\s*\|\|\s*!isTauriRuntime\(\)/.test(src),
      "o caminhoraw ainda passa direto quando nao e Tauri",
    );
  });

  it("recusa caminho local quando nao ha destino", () => {
    assert.ok(
      /if \(localPath === null\)/.test(src),
      "falta o ramo que recusa localPath nulo",
    );
  });

  it("nao invoca load_image com o src cru do documento", () => {
    assert.ok(
      /invoke<string>\("load_image", \{ path: localPath \}\)/.test(src),
      "load_image deve receber o caminho resolvido, nunca o src cru",
    );
    assert.ok(
      !/invoke<string>\("load_image", \{ path: originalSrc \}\)/.test(src),
      "load_image nao pode receber o src cru do documento",
    );
  });
});
