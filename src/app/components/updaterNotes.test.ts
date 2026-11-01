import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { renderUpdaterNotes } from "./updaterNotes.ts";

/* Seam: **a nota da release vira elemento, não texto cru**.
 *
 * O cartão de Atualizações recebia o corpo da release — Markdown do feed — dentro
 * de um `<p>` com `whitespace-pre-line`, e a pessoa via `## v1.8.5`, `###` e
 * `**asteriscos**` literais. O que este arquivo prova é o contrato da renderização:
 * o mesmo pipeline do preview (`react-markdown` + `rehype-sanitize` com o schema
 * do app) transforma a nota real em títulos, listas e ênfase — e **não** deixa
 * passar nada executável, porque o texto vem da rede.
 *
 * O valor esperado vem da nota publicada da v1.8.5 (`gh release view v1.8.5`),
 * copiada aqui literalmente: é a fonte independente do código, não uma
 * re-expressão dele.
 */

/** Corpo da release v1.8.5 (trecho da versão), copiado do publicado. */
const NOTA_V185 = `![Mark-Lee](https://github.com/mafhper/mark-lee/releases/download/v1.8.5/release-v1.8.webp)

# Mark-Lee

> Reúne um editor Markdown elegante e um espaço local-first de Memórias sobre os mesmos arquivos.

## v1.8.5 — a assinatura do Linux passa a ter o nome do arquivo que existe

A entrega procurava a assinatura do AppImage num nome que o pacote nunca gera, e
parava na hora de publicá-la. O aplicativo em si não mudou: o que muda é o
contrato da esteira que monta a atualização.

### Corrigido

- **A assinatura do AppImage do Linux voltou a ser encontrada.** O contrato do
  updater esperava \`*.AppImage.tar.gz.sig\`, mas o pacote \`appimage\` assina o
  AppImage direto e grava \`*.AppImage.sig\` ao lado dele.
`;

const html = renderToStaticMarkup(renderUpdaterNotes(NOTA_V185));

test("os marcadores da nota viram elementos de verdade", () => {
  assert.ok(
    html.includes("<h2>v1.8.5 — a assinatura do Linux passa a ter o nome do arquivo que existe</h2>"),
    "o cabeçalho de nível 2 da nota não virou título — a tela mostraria `##` literal"
  );
  assert.ok(html.includes("<h3>Corrigido</h3>"), "o subtítulo `###` da nota não virou título");
  assert.ok(html.includes("<h1>Mark-Lee</h1>"), "o título do corpo da release não virou título");

  assert.ok(html.includes("<ul>") && html.includes("<li>"), "a lista de correções não virou lista");
  assert.ok(
    html.includes("<strong>A assinatura do AppImage do Linux voltou a ser encontrada.</strong>"),
    "a ênfase `**…**` da nota não virou negrito"
  );
  assert.ok(
    html.includes("<code>*.AppImage.tar.gz.sig</code>"),
    "o trecho entre crases não virou código — apareceria com as crases à mostra"
  );
});

test("nenhum marcador de Markdown sobra no texto renderizado", () => {
  for (const marcador of ["##", "###", "**", "`"]) {
    assert.ok(!html.includes(marcador), `a nota renderizada ainda mostra ${marcador} literal`);
  }
});

test("a imagem remota do corpo da release não é baixada pelo cartão", () => {
  // O banner do corpo aponta para o asset da release; os Ajustes não pedem rede
  // para abrir uma tela, e um banner num cartão de três linhas só empurraria o
  // texto para fora. O parágrafo que sobra vazio também não fica.
  assert.ok(!html.includes("<img"), "o cartão voltou a carregar a imagem remota da release");
  assert.ok(!html.includes("<p></p>"), "sobrou um parágrafo vazio no lugar da imagem");
});

test("nota hostil da rede não executa nada", () => {
  const hostil = renderToStaticMarkup(
    renderUpdaterNotes(
      [
        "## versão nova",
        "",
        "<script>window.__tomou = true</script>",
        "<img src=\"x\" onerror=\"window.__tomou = true\">",
        "<iframe src=\"https://exemplo.invalido\"></iframe>",
        "",
        "[clique](javascript:window.__tomou=true)",
      ].join("\n")
    )
  );

  assert.ok(!/<script/i.test(hostil), "uma tag script atravessou a sanitização");
  assert.ok(!/<iframe/i.test(hostil), "um iframe atravessou a sanitização");
  assert.ok(!/\son\w+=/i.test(hostil), "um atributo de evento atravessou a sanitização");
  assert.ok(!/javascript:/i.test(hostil), "um link `javascript:` atravessou a sanitização");
  assert.ok(hostil.includes("versão nova"), "a sanitização apagou também o conteúdo legítimo");
});

test("o cartão desenha as notas com este renderizador, e não com o texto cru", () => {
  // O renderizador só serve se o cartão o usar: o pipeline certo com o `<p>` de
  // antes na tela seria o mesmo defeito com código novo ao lado. Fonte, e não
  // render, porque `.tsx` não roda neste runner.
  const cartao = readFileSync("src/app/components/UpdaterStatusCard.tsx", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  assert.match(cartao, /renderUpdaterNotes\(state\.notes\)/, "o cartão não usa o renderizador de notas");
  assert.ok(
    !/whitespace-pre-line/.test(cartao),
    "o cartão voltou a mostrar a nota como texto pré-formatado (o `##` literal)"
  );
});
