import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/* A regra do conflito está provada em `conflictResolution.test.ts`, e a do
 * rascunho em `drafts.test.ts` / `draftKeeper.test.ts` — de fora, com disco,
 * sessão e relógio injetados. O que falta provar é a **fiação**: o app poderia
 * continuar sobrescrevendo o disco por fora do diálogo, ou continuar guardando a
 * única cópia do texto no `localStorage`, e a regra certa não protegeria
 * ninguém.
 *
 * `App` só monta dentro do Tauri (editor, sidebar, watcher), então o teste é de
 * fonte — o mesmo recurso de `closeWiring.test.ts` e `lifecycleWiring.test.ts`.
 */

function semComentarios(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function bloco(fonte: string, nome: string): string | null {
  const inicio = fonte.indexOf(`const ${nome} = `);
  if (inicio === -1) return null;
  const fim = fonte.indexOf("\n  };", inicio);
  return fim === -1 ? null : fonte.slice(inicio, fim);
}

const app = semComentarios("src/App.tsx");
const bridge = semComentarios("src/services/filesystem.ts");
const rustLib = readFileSync("src-tauri/src/lib.rs", "utf8");
const rustDrafts = semComentarios("src-tauri/src/documents/drafts.rs");
const rustPersistence = semComentarios("src-tauri/src/documents/persistence.rs");

test("o conflito externo abre o diálogo com as quatro ações", () => {
  assert.match(app, /<ConflictModal/, "o diálogo de conflito não é renderizado em App.tsx");
  assert.match(app, /answerConflictChoice\("reload"\)/, "Recarregar não está ligado ao diálogo");
  assert.match(app, /answerConflictChoice\("save-copy"\)/, "Salvar cópia não está ligado ao diálogo");
  assert.match(app, /answerConflictChoice\("cancel"\)/, "Cancelar não está ligado ao diálogo");
  assert.match(app, /compareConflictingVersion/, "Comparar não está ligado ao diálogo");
});

test("o save só pergunta quando o pedido é explícito", () => {
  const salvar = bloco(app, "saveTab");
  assert.ok(salvar, "saveTab não existe mais em App.tsx");
  assert.match(
    salvar,
    /if \(promptOnConflict\) await resolveTabConflict\(tab\);/,
    "o save não abre o diálogo de conflito"
  );
  assert.ok(
    !/window\.confirm\s*\(/.test(salvar),
    "o conflito voltou ao `window.confirm`, que não sabe Recarregar/Comparar/Salvar cópia"
  );
  assert.match(
    app,
    /save: \(tab\) => saveTabRef\.current\(tab, false, false\)/,
    "a guarda de fechamento voltou a abrir um modal de conflito dentro do próprio await"
  );
});

test("Salvar cópia usa criação exclusiva, nunca substituição", () => {
  const resolver = bloco(app, "resolveTabConflict");
  assert.ok(resolver, "resolveTabConflict não existe mais em App.tsx");
  assert.match(resolver, /createExclusive: writeNewFile/, "a cópia perdeu a criação exclusiva");
  assert.match(resolver, /readDisk: readFile/, "Recarregar deixou de reler o disco");
  assert.match(
    resolver,
    /if \(choice === "cancel"\) return;/,
    "Cancelar não sai antes de qualquer I/O"
  );
  assert.ok(
    !/\bwriteFile\(/.test(resolver),
    "a cópia voltou a usar `writeFile`, que substitui o destino"
  );
  assert.match(
    bridge,
    /invoke\("write_file_new"/,
    "o app não chama o comando de criação exclusiva do backend"
  );
  assert.match(
    rustPersistence,
    /create_new\(true\)/,
    "a criação exclusiva perdeu o `create_new(true)` do sistema de arquivos"
  );
});

test("o rascunho vai para o armazenamento durável do backend", () => {
  assert.match(app, /createDraftStore\(/, "o app não monta o armazenamento de rascunhos");
  assert.match(
    bridge,
    /invoke(?:<[^>]*>)?\("write_document_draft"/,
    "gravar rascunho não chega ao backend"
  );
  assert.match(
    bridge,
    /invoke(?:<[^>]*>)?\("list_document_drafts"/,
    "a recuperação não lê o backend"
  );
  assert.match(
    bridge,
    /invoke(?:<[^>]*>)?\("delete_document_draft"/,
    "remover rascunho não chega ao backend"
  );
  for (const comando of [
    "write_document_draft",
    "list_document_drafts",
    "delete_document_draft",
  ]) {
    assert.ok(
      rustLib.includes(comando),
      `o comando ${comando} não está registrado no invoke_handler`
    );
  }
  assert.match(
    rustDrafts,
    /safe_write\(/,
    "o rascunho deixou de usar o primitivo seguro de gravação do ML-H02"
  );
});

test("a abertura recupera o rascunho e o combina com o cache de abas", () => {
  assert.match(app, /await documentDrafts\.list\(\)/, "a abertura não lê rascunhos duráveis");
  assert.match(
    app,
    /mergeDraftRecovery\(tabsRef\.current, drafts\)/,
    "a recuperação não parte das abas realmente abertas"
  );
  assert.match(app, /restoreDraft\(/, "a sessão não é restaurada a partir do rascunho");
  assert.match(app, /setActiveTabId\(recoveredNewest\)/, "o trabalho recuperado não vem para a frente");
  // O cache continua existindo — é estado de interface. O que não pode voltar é
  // ele ser a única fonte do texto.
  assert.match(app, /saveLastTabs\(tabs\)/, "o cache de abas foi removido em vez de rebaixado");
});

test("editar, fechar e sair conversam com o guardião de rascunhos", () => {
  const edicao = bloco(app, "updateActiveTabContent");
  assert.ok(edicao, "updateActiveTabContent não existe mais em App.tsx");
  assert.match(
    edicao,
    /draftKeeperRef\.current\?\.note\(activeTab\.id\)/,
    "editar não avisa o guardião de rascunhos"
  );

  const fechamento = bloco(app, "applyClose");
  assert.ok(fechamento, "applyClose não existe mais em App.tsx");
  assert.match(
    fechamento,
    /draftKeeperRef\.current\?\.forget\(id\)/,
    "fechar aba não apaga o rascunho durável (o texto descartado voltaria na próxima abertura)"
  );
  // Apagar o rascunho pode esperar uma gravação em voo; a promessa não pode ser
  // descartada, senão o `remove` chega depois da saída e o rascunho volta.
  assert.match(
    fechamento,
    /await Promise\.all\(/,
    "o fechamento voltou a ignorar a remoção dos rascunhos"
  );
  assert.ok(
    !/void draftKeeperRef\.current\?\.forget/.test(app),
    "algum ponto do app voltou a descartar a promessa de `forget`"
  );

  assert.match(
    app,
    /draftKeeperRef\.current\?\.flushAll\(\)/,
    "sair do app não descarrega os rascunhos pendentes"
  );
  const saida = app.slice(
    app.indexOf("lifecycle.requestExit"),
    app.indexOf("lifecycle.requestExit") + 2000
  );
  assert.match(
    saida,
    /draftKeeperRef\.current\?\.forget/,
    "a saída preservou rascunhos de abas que o usuário salvou ou descartou"
  );
});
