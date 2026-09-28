import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolvePreviewLink, resolveLocalLinkPath } from "./resolvePreviewLink.ts";

// Documento real em disco. Um link relativo tem que resolver contra a PASTA do
// documento, senão `onOpenFile` recebia "./CHANGELOG.md" e o processo resolvia
// contra o CWD — o arquivo irmão nunca abria.
const DOC = "C:/Users/mfhper/Documents/Github/mark-lee/README.md";
const DOC_WINDOWS = "C:\\Users\\mafhper\\Documents\\Github\\mark-lee\\README.md";

describe("resolvePreviewLink", () => {
  it("classifica http:// como external", () => {
    const result = resolvePreviewLink("http://example.com", "http://example.com/");
    assert.equal(result.kind, "external");
  });

  it("classifica https:// como external", () => {
    const result = resolvePreviewLink("https://example.com/path", "https://example.com/path");
    assert.equal(result.kind, "external");
  });

  it("classifica #section como anchor", () => {
    const result = resolvePreviewLink("#section", "#section");
    assert.equal(result.kind, "anchor");
  });

  it("classifica mailto: como email", () => {
    const result = resolvePreviewLink("mailto:user@example.com", "mailto:user@example.com");
    assert.equal(result.kind, "email");
  });

  it("classifica protocolos desconhecidos como unsupported", () => {
    const result = resolvePreviewLink("javascript:alert(1)", "javascript:alert(1)");
    assert.equal(result.kind, "unsupported");
  });

  it("classifica href vazio como unsupported", () => {
    const result = resolvePreviewLink("", "");
    assert.equal(result.kind, "unsupported");
  });

  // Antes destes dois casos eram local-file devolvendo o href cru, sem base.
  it("resolve caminho relativo contra a pasta do documento", () => {
    const result = resolvePreviewLink("./other.md", "http://127.0.0.1:5173/other.md", DOC);
    assert.equal(result.kind, "local-file");
    assert.equal(result.originalHref, "./other.md");
    assert.equal(
      result.localPath,
      "C:/Users/mfhper/Documents/Github/mark-lee/other.md",
    );
  });

  it("resolve caminho relativo sem ./ usando caminho Windows", () => {
    const result = resolvePreviewLink("CHANGELOG.md", "http://127.0.0.1:5173/CHANGELOG.md", DOC_WINDOWS);
    assert.equal(result.kind, "local-file");
    assert.equal(
      result.localPath,
      "C:/Users/mafhper/Documents/Github/mark-lee/CHANGELOG.md",
    );
  });

  it("resolve caminho com subdiretório relativo", () => {
    const result = resolvePreviewLink(
      "./template/docs/guia.md",
      "http://127.0.0.1:5173/template/docs/guia.md",
      DOC,
    );
    assert.equal(result.localPath, "C:/Users/mfhper/Documents/Github/mark-lee/template/docs/guia.md");
  });

  it("preserva caminho absoluto sem reescrever", () => {
    const result = resolvePreviewLink("/docs/readme.md", "http://127.0.0.1:5173/docs/readme.md", DOC);
    assert.equal(result.kind, "local-file");
    assert.equal(result.localPath, "/docs/readme.md");
  });

  it("preserva caminho com letra de drive", () => {
    const result = resolvePreviewLink("C:/outro/arquivo.md", "http://127.0.0.1:5173/x.md", DOC);
    assert.equal(result.localPath, "C:/outro/arquivo.md");
  });

  // Documento Untitled / colado: não há pasta, então não existe destino correto.
  // Antes caía num endereço falso (a origem do app).
  it("sem pasta do documento, relativo vira unsupported", () => {
    const result = resolvePreviewLink("./other.md", "http://127.0.0.1:5173/other.md", null);
    assert.equal(result.kind, "unsupported");
    assert.equal(result.localPath, null);
  });

  it("sem basePath, relativo vira unsupported", () => {
    const result = resolvePreviewLink("./other.md", "http://127.0.0.1:5173/other.md");
    assert.equal(result.kind, "unsupported");
  });

  it("preserva originalHref e resolvedHref mesmo resolvendo o caminho", () => {
    const result = resolvePreviewLink("./page.md", "http://127.0.0.1:5173/page.md", DOC);
    assert.equal(result.originalHref, "./page.md");
    assert.equal(result.resolvedHref, "http://127.0.0.1:5173/page.md");
  });
});

describe("resolveLocalLinkPath", () => {
  it("extrai o diretório e junta", () => {
    assert.equal(
      resolveLocalLinkPath("a.md", "/home/user/doc.md"),
      "/home/user/a.md",
    );
  });

  it("normaliza separador do documento Windows", () => {
    assert.equal(
      resolveLocalLinkPath("a.md", "C:\\proj\\doc.md"),
      "C:/proj/a.md",
    );
  });

  it("devolve null sem base", () => {
    assert.equal(resolveLocalLinkPath("a.md", null), null);
  });

  it("devolve null para href vazio", () => {
    assert.equal(resolveLocalLinkPath("   ", "/home/user/doc.md"), null);
  });

  it("devolve null quando o documento não tem diretório", () => {
    assert.equal(resolveLocalLinkPath("a.md", "doc.md"), null);
  });
});
