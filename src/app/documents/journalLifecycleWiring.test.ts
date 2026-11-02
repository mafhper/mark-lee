import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { createDocumentLifecycleCoordinator, type LifecycleCandidate } from "./lifecycleCoordinator.ts";
import { createPendingWorkRegistry } from "./pendingWork.ts";

/* A regra do registro está provada em `pendingWork.test.ts` e a do coordenador em
 * `lifecycleCoordinator.test.ts`, as duas de fora. O que falta provar é a
 * **fiação das Memórias**: o diário tem debounce próprio, e a saída do
 * aplicativo só o cobre se o painel de entrada se registrar no coordenador — em
 * vez de num registro paralelo que quem chama tem de lembrar de somar.
 *
 * O teste é misto de propósito: a primeira metade roda o coordenador de verdade
 * contra um flusher com a forma do diário; a segunda é de fonte, porque o painel
 * só monta dentro do React/Tauri.
 */

interface Tab extends LifecycleCandidate {
  id: string;
  name: string;
  dirty: boolean;
}

function semComentarios(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const PANEL = "src/features/journal/components/JournalEntryPanel.tsx";
const APP = "src/App.tsx";
const WORKSPACE = "src/features/journal/JournalWorkspace.tsx";
const ACTIVE_TARGET = "src/features/editor/active-target.ts";

test("a saída do app descarrega a gravação pendente do diário", async () => {
  // Forma do `flushPendingSave` do painel: devolve `false` quando a gravação
  // prometida não foi para o disco.
  const pendingWork = createPendingWorkRegistry();
  const escrita: string[] = [];
  pendingWork.register({
    label: "journal-entry",
    flush: async () => {
      escrita.push("entrada.md");
      return true;
    },
  });

  const coordinator = createDocumentLifecycleCoordinator<Tab>({
    candidates: () => [],
    ask: async () => "discard",
    save: async () => ({ kind: "cancelled" }),
    close: () => undefined,
    flush: async () => 0,
    pendingWork,
  });

  let saiu = false;
  const result = await coordinator.requestExit(() => {
    saiu = true;
  });

  assert.deepEqual(escrita, ["entrada.md"], "a saída não escreveu a entrada pendente");
  assert.equal(result.proceeded, true);
  assert.equal(saiu, true);
});

test("gravação do diário que falha impede a saída", async () => {
  const pendingWork = createPendingWorkRegistry();
  pendingWork.register({ label: "journal-entry", flush: async () => false });

  const coordinator = createDocumentLifecycleCoordinator<Tab>({
    candidates: () => [],
    ask: async () => "discard",
    save: async () => ({ kind: "cancelled" }),
    close: () => undefined,
    flush: async () => 0,
    pendingWork,
  });

  let saiu = false;
  const result = await coordinator.requestExit(() => {
    saiu = true;
  });

  assert.equal(result.proceeded, false);
  assert.equal(result.blocker, "pending_flush_failed");
  assert.equal(saiu, false, "a janela fechou por cima de uma entrada que não foi gravada");
});

test("o painel de entrada registra a gravação pendente no coordenador", () => {
  const painel = semComentarios(PANEL);
  assert.match(
    painel,
    /appPendingWork\.register\(\{\s*label: "journal-entry",\s*flush: flushPendingSave\s*\}\)/,
    "o diário não registra o debounce no coordenador — a saída não tem como cobri-lo",
  );
  assert.ok(
    !/registerFlushHandler/.test(painel),
    "o painel voltou a um registro paralelo ao do coordenador",
  );
  // O registro é um efeito: registrar durante o render deixa uma entrada órfã
  // quando o React descarta aquele render.
  assert.match(
    painel,
    /useEffect\(\s*\(\) => appPendingWork\.register/,
    "o registro do diário saiu de um efeito",
  );
});

test("o app entrega o mesmo registro ao coordenador", () => {
  const app = semComentarios(APP);
  assert.match(app, /import \{ appPendingWork \} from "\.\/app\/documents\/pendingWork"/);
  assert.match(
    app,
    /pendingWork: appPendingWork,/,
    "o coordenador não recebe o registro — o trabalho do diário fica fora da saída",
  );
  // A soma manual do diário na saída era o defeito do P0.3: uma saída nova
  // nascia sem ela.
  const flush = app.slice(app.indexOf("flush: async () =>"), app.indexOf("pendingWork: appPendingWork,"));
  assert.ok(
    !/appPendingWork\.flushAll\(\)/.test(flush),
    "a saída voltou a somar o diário por conta própria em vez de consultar o registro",
  );
});

test("recarregar o caderno e 'Salvar agora' continuam drenando o pendente", () => {
  const workspace = semComentarios(WORKSPACE);
  assert.match(
    workspace,
    /await appPendingWork\.flushAll\(\);\s*await loadJournal\(/,
    "recarregar o caderno relê o disco por cima de uma gravação pendente",
  );
  assert.match(workspace, /handleSaveActive[\s\S]{0,120}appPendingWork\.flushAll\(\)/);
});

test("o registro de flushers não existe mais fora do coordenador", () => {
  const alvo = semComentarios(ACTIVE_TARGET);
  assert.ok(
    !/registerFlushHandler|flushAllPending/.test(alvo),
    "`active-target.ts` voltou a manter um registro de trabalho prometido paralelo",
  );
  // O que ele ainda deve expor é o alvo ativo (busca, formatar, exportar).
  assert.match(alvo, /export function getActiveTarget\(\)/);
});
