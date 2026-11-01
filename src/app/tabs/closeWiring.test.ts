import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/* A regra do ML-H04 está provada em `closeGuard.test.ts`, de fora, com a
 * pergunta/gravação/aplicação injetadas. O que falta provar é a **fiação**: o
 * app poderia continuar fechando abas por fora da guarda, e aí a regra certa
 * não protegeria ninguém. `App` só monta dentro do Tauri (editor, sidebar,
 * watcher), então o teste aqui é de fonte — o mesmo recurso que `Sidebar.test.ts`
 * usa para uma invariante que também não dá para renderizar.
 *
 * O que este arquivo trava:
 *   1. fechar aba não pergunta por `window.confirm` e passa pela guarda;
 *   2. fechar outras/à direita/todas usam a mesma guarda;
 *   3. o diálogo tem as três ações ligadas a decisões **distintas**. */

const FONTE = "src/App.tsx";
const src = readFileSync(FONTE, "utf8");

/* Comentários fora: este arquivo cita `window.confirm` de propósito, e casar a
 * discussão do defeito como se fosse o defeito foi o que já mordeu o teste da
 * Sidebar. */
const codigo = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Bloco de uma declaração `const nome = …` até a linha `  };` (indentação da App). */
function bloco(nome: string): string | null {
  const inicio = codigo.indexOf(`const ${nome} = `);
  if (inicio === -1) return null;
  const fim = codigo.indexOf("\n  };", inicio);
  return fim === -1 ? null : codigo.slice(inicio, fim);
}

test("fechar aba pergunta pelas três ações, nunca por confirm booleano", () => {
  const closeTab = bloco("closeTabWithPrompt");
  assert.ok(closeTab, "closeTabWithPrompt não existe mais em App.tsx");
  assert.ok(
    !/window\.confirm/.test(closeTab),
    "o fechamento voltou ao `window.confirm`, que só sabe 'sim/não' e ignora o resultado",
  );
  assert.ok(
    !/setTabs/.test(closeTab),
    "fechar aba voltou a remover a aba por conta própria: quem aplica o fechamento é a guarda",
  );
  assert.match(
    closeTab,
    /closeTabs\(|runClose\(/,
    "fechar aba precisa passar pela guarda, não remover a aba direto",
  );
});

test("os fechamentos em lote entram pela mesma guarda", () => {
  for (const nome of ["closeOtherTabs", "closeRightTabs"]) {
    const funcao = bloco(nome);
    assert.ok(funcao, `${nome} não existe mais em App.tsx`);
    assert.ok(!/setTabs\(/.test(funcao), `${nome} remove abas por conta própria, sem decisão`);
    assert.match(funcao, /closeTabs\(|runClose\(/, `${nome} não pode fechar sem passar pela guarda`);
  }

  const fecharTodas = bloco("closeAllTabs");
  assert.ok(fecharTodas, "closeAllTabs não existe mais em App.tsx");
  assert.match(fecharTodas, /runClose\(/, "closeAllTabs não pode descartar abas sem guarda");
});

test("fechar outras não é mais um filtro inline", () => {
  assert.doesNotMatch(
    codigo,
    /onCloseOthers=\{\s*\(tabId\)\s*=>/,
    "a barra de abas voltou a fechar 'outras' com um filtro inline, sem decisão",
  );
  assert.match(codigo, /onCloseOthers=\{closeOtherTabs\}/, "onCloseOthers precisa apontar para a guarda");
});

test("o diálogo de fechamento tem as três ações distintas", () => {
  assert.match(codigo, /<ConfirmModal/, "o diálogo de fechamento não está montado");
  assert.match(codigo, /onConfirm=\{\(\) => answerClosePrompt\("save"\)\}/, "ação Salvar não está ligada");
  assert.match(codigo, /onDiscard=\{\(\) => answerClosePrompt\("discard"\)\}/, "ação Descartar não está ligada");
  assert.match(codigo, /onClose=\{\(\) => answerClosePrompt\("cancel"\)\}/, "ação Cancelar não está ligada");
});
