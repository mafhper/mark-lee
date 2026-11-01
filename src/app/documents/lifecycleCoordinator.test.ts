import assert from "node:assert/strict";
import test from "node:test";

import type { SaveOutcome } from "../../services/documents.ts";
import type { CloseDecision } from "../tabs/closeGuard.ts";
import {
  createDocumentLifecycleCoordinator,
  type LifecycleCandidate,
} from "./lifecycleCoordinator.ts";
import { isSameOrInsidePath } from "./paths.ts";
import { createPendingWorkRegistry, type PendingWorkRegistry } from "./pendingWork.ts";

/* Seam: o **contrato do coordenador** — quais documentos entram na pergunta,
 * em que ordem o trabalho é escrito e o que acontece quando a resposta não
 * libera a saída. Nada de React, nada de Tauri, nada de `window.confirm`.
 *
 * A regra "só fecha em `saved` ou `discard`" é do `runClose` (ML-H04) e tem
 * teste próprio; aqui se prova que as cinco saídas do aplicativo passam por ela
 * e que cancelar preserva a sessão em todas.
 */

interface Tab extends LifecycleCandidate {
  id: string;
  name: string;
  dirty: boolean;
  path: string | null;
}

function tab(id: string, path: string | null, dirty: boolean): Tab {
  return { id, name: `${id}.md`, dirty, path };
}

function saved(documentId: string): SaveOutcome {
  return { kind: "saved", documentId, revision: 1, diskHash: "0000000000000000" };
}

interface Setup {
  tabs?: Tab[];
  decisions?: Record<string, CloseDecision>;
  outcomes?: Record<string, SaveOutcome>;
  flushFailures?: number;
  stillDirty?: (tab: Tab) => boolean;
  candidates?: () => readonly Tab[];
  flush?: () => Promise<number>;
  pendingWork?: PendingWorkRegistry;
}

function setup(config: Setup = {}) {
  const tabs = config.tabs ?? [];
  const events: string[] = [];
  const closed: string[][] = [];

  const coordinator = createDocumentLifecycleCoordinator<Tab>({
    candidates: config.candidates ?? (() => tabs),
    ask: async (candidate) => {
      events.push(`ask:${candidate.id}`);
      return config.decisions?.[candidate.id] ?? "cancel";
    },
    save: async (candidate) => {
      events.push(`save:${candidate.id}`);
      return config.outcomes?.[candidate.id] ?? saved(candidate.id);
    },
    close: (ids) => {
      events.push(`close:${ids.join(",")}`);
      closed.push([...ids]);
    },
    flush:
      config.flush ??
      (async () => {
        events.push("flush");
        return config.flushFailures ?? 0;
      }),
    stillDirty: config.stillDirty,
    pendingWork: config.pendingWork,
  });

  return { coordinator, tabs, events, closed };
}

test("aba limpa fecha sem pergunta e sem gravação", async () => {
  const tabs = [tab("a", "/notas/a.md", false)];
  const { coordinator, events, closed } = setup({ tabs });

  const result = await coordinator.requestClose(tabs);

  assert.equal(result.proceeded, true);
  assert.equal(result.cancelled, false);
  assert.deepEqual(result.released, ["a"]);
  assert.deepEqual(closed, [["a"]]);
  assert.deepEqual(events, ["close:a"], "pediu decisão para uma aba sem trabalho a perder");
});

test("cancelar o fechamento preserva a sessão inteira", async () => {
  const tabs = [tab("a", "/notas/a.md", true), tab("b", "/notas/b.md", true)];
  const { coordinator, events, closed } = setup({
    tabs,
    decisions: { a: "save", b: "cancel" },
  });

  const result = await coordinator.requestClose(tabs);

  assert.equal(result.proceeded, false);
  assert.equal(result.cancelled, true);
  assert.equal(result.blocker, "cancelled");
  assert.deepEqual(result.kept, ["a", "b"]);
  assert.deepEqual(closed, [], "fechou aba mesmo com o usuário cancelando");
  assert.deepEqual(events, ["ask:a", "ask:b"], "gravou antes de coletar todas as decisões");
});

test("Salvar que falha aborta o fechamento em vez de fechar assim mesmo", async () => {
  const tabs = [tab("a", "/notas/a.md", true)];
  const { coordinator, closed } = setup({
    tabs,
    decisions: { a: "save" },
    outcomes: { a: { kind: "failed", reason: "permissão negada" } },
  });

  const result = await coordinator.requestClose(tabs);

  assert.equal(result.proceeded, false);
  assert.equal(result.blocker, "not_released");
  assert.deepEqual(result.kept, ["a"]);
  assert.deepEqual(closed, []);
});

test("sair escreve o pendente antes de perguntar, e só então destrói", async () => {
  const tabs = [tab("a", "/notas/a.md", true), tab("b", "/notas/b.md", false)];
  const { coordinator, events } = setup({ tabs, decisions: { a: "save" } });

  let destroyed = false;
  const result = await coordinator.requestExit(() => {
    destroyed = true;
    events.push("proceed");
  });

  assert.equal(result.proceeded, true);
  assert.equal(destroyed, true);
  assert.deepEqual(events, ["flush", "ask:a", "save:a", "proceed"]);
});

test("cancelar a saída não destrói nada", async () => {
  const tabs = [tab("a", "/notas/a.md", true)];
  const { coordinator } = setup({ tabs, decisions: { a: "cancel" } });

  let destroyed = false;
  const result = await coordinator.requestExit(() => {
    destroyed = true;
  });

  assert.equal(result.cancelled, true);
  assert.equal(destroyed, false);
});

test("flush prometido que falha bloqueia a saída com motivo próprio", async () => {
  const tabs = [tab("a", "/notas/a.md", false)];
  const { coordinator } = setup({ tabs, flushFailures: 1 });

  let destroyed = false;
  const result = await coordinator.requestExit(() => {
    destroyed = true;
  });

  assert.equal(result.proceeded, false);
  assert.equal(result.blocker, "pending_flush_failed");
  assert.equal(result.cancelled, false);
  assert.equal(destroyed, false);
});

test("sair descarrega o trabalho prometido ao coordenador mesmo sem quem chama somar", async () => {
  // O P0.3 prometia **um** ponto consultado por todas as saídas. As superfícies
  // com debounce próprio (o diário) prometem trabalho que não é documento do
  // editor: elas se registram, e o coordenador consulta o registro na saída.
  const pendingWork = createPendingWorkRegistry();
  const events: string[] = [];
  pendingWork.register({
    label: "journal-entry",
    flush: () => {
      events.push("journal:flush");
    },
  });

  const { coordinator } = setup({ tabs: [], pendingWork });

  let destroyed = false;
  const result = await coordinator.requestExit(() => {
    destroyed = true;
  });

  assert.deepEqual(events, ["journal:flush"], "a saída não descarregou o diário");
  assert.equal(result.proceeded, true);
  assert.equal(destroyed, true);
});

test("trabalho prometido que falha bloqueia a saída com motivo próprio", async () => {
  const pendingWork = createPendingWorkRegistry();
  pendingWork.register({ label: "journal-entry", flush: () => false });

  const { coordinator } = setup({ tabs: [], pendingWork });

  let destroyed = false;
  const result = await coordinator.requestExit(() => {
    destroyed = true;
  });

  assert.equal(result.proceeded, false);
  assert.equal(result.blocker, "pending_flush_failed");
  assert.equal(result.cancelled, false);
  assert.equal(destroyed, false, "saiu por cima de uma gravação do diário que falhou");
});

test("trocar de workspace também descarrega o registro", async () => {
  const pendingWork = createPendingWorkRegistry();
  let flushed = 0;
  pendingWork.register({ label: "journal-entry", flush: () => { flushed += 1; } });

  const { coordinator } = setup({ tabs: [], pendingWork });

  await coordinator.requestWorkspaceSwitch(() => undefined);

  assert.equal(flushed, 1, "trocar de workspace abandonou o pendente do diário");
});

test("fechar aba não descarrega o registro — fechar aba não é sair do app", async () => {
  const pendingWork = createPendingWorkRegistry();
  let flushed = 0;
  pendingWork.register({ label: "journal-entry", flush: () => { flushed += 1; } });

  const tabs = [tab("a", "/notas/a.md", false)];
  const { coordinator } = setup({ tabs, pendingWork });

  await coordinator.requestClose(tabs);

  assert.equal(flushed, 0, "fechar uma aba do editor virou saída do aplicativo");
});

test("o registro é descarregado antes de perguntar pelas abas", async () => {
  const pendingWork = createPendingWorkRegistry();
  const tabs = [tab("a", "/notas/a.md", true)];
  const { coordinator, events } = setup({ tabs, decisions: { a: "save" }, pendingWork });
  pendingWork.register({ label: "journal-entry", flush: () => { events.push("journal:flush"); } });

  await coordinator.requestExit(() => undefined);

  assert.deepEqual(
    events,
    ["journal:flush", "flush", "ask:a", "save:a"],
    "a saída perguntou antes de escrever o que já estava prometido"
  );
});

test("trocar de workspace não pergunta o que o flush já resolveu", async () => {
  let tabs: Tab[] = [tab("a", "/notas/a.md", true)];
  const asked: string[] = [];

  const coordinator = createDocumentLifecycleCoordinator<Tab>({
    candidates: () => tabs,
    ask: async (candidate) => {
      asked.push(candidate.id);
      return "cancel";
    },
    save: async (candidate) => saved(candidate.id),
    close: () => undefined,
    flush: async () => {
      tabs = tabs.map((item) => ({ ...item, dirty: false }));
      return 0;
    },
  });

  let switched = false;
  const result = await coordinator.requestWorkspaceSwitch(() => {
    switched = true;
  });

  assert.equal(result.proceeded, true);
  assert.equal(switched, true);
  assert.deepEqual(asked, [], "perguntou por um documento que o autosave salvou");
});

test("trocar de workspace cancelado mantém o workspace atual", async () => {
  const tabs = [tab("a", "/notas/a.md", true)];
  const { coordinator } = setup({ tabs, decisions: { a: "cancel" } });

  let switched = false;
  const result = await coordinator.requestWorkspaceSwitch(() => {
    switched = true;
  });

  assert.equal(result.cancelled, true);
  assert.equal(switched, false);
});

test("operação destrutiva só olha os documentos que o alvo alcança", async () => {
  const tabs = [tab("dentro", "/notas/a.md", true), tab("fora", "/outros/b.md", true)];
  const { coordinator, events } = setup({ tabs, decisions: { dentro: "cancel" } });

  let deleted = false;
  const result = await coordinator.requestDestructive("/notas", () => {
    deleted = true;
  });

  assert.deepEqual(events, ["ask:dentro"], "perguntou por documento fora do alvo");
  assert.equal(result.cancelled, true);
  assert.equal(deleted, false);
});

test("operação destrutiva sobre caminho irmão não pergunta nada", async () => {
  const tabs = [tab("irma", "/notas-velhas/a.md", true)];
  const { coordinator, events } = setup({ tabs });

  let deleted = false;
  const result = await coordinator.requestDestructive("/notas", () => {
    deleted = true;
  });

  assert.deepEqual(events, []);
  assert.equal(result.proceeded, true);
  assert.equal(deleted, true);
});

test("Arquivo → Novo cancelado não cria documento nenhum", async () => {
  const tabs = [tab("a", "/notas/a.md", true)];
  const { coordinator } = setup({ tabs, decisions: { a: "cancel" } });

  let created = false;
  const result = await coordinator.requestReplace(tabs, () => {
    created = true;
  });

  assert.equal(result.cancelled, true);
  assert.equal(created, false);

  const clean = setup({ tabs: [tab("b", "/notas/b.md", false)] });
  let createdAfterClean = false;
  const second = await clean.coordinator.requestReplace(clean.tabs, () => {
    createdAfterClean = true;
  });
  assert.equal(second.proceeded, true);
  assert.equal(createdAfterClean, true);
});

test("aba liberada que voltou a ficar suja durante o I/O não fecha", async () => {
  const tabs = [tab("a", "/notas/a.md", true)];
  // A re-checagem que o ML-H04 deixou anotada: a resposta do usuário vale para o
  // texto que existia quando ele foi perguntado; a sessão diz que há mais.
  const { coordinator, closed } = setup({
    tabs,
    decisions: { a: "save" },
    stillDirty: () => true,
  });

  const result = await coordinator.requestClose(tabs);

  assert.equal(result.proceeded, false);
  assert.equal(result.blocker, "not_released");
  assert.deepEqual(result.kept, ["a"]);
  assert.deepEqual(closed, [], "fechou por cima de uma edição que ninguém viu");
});

test("comportamento de containment de caminho", () => {
  assert.equal(isSameOrInsidePath("/notas", "/notas/a.md"), true);
  assert.equal(isSameOrInsidePath("/notas", "/notas/sub/a.md"), true);
  assert.equal(isSameOrInsidePath("C:\\Users\\x\\Notas", "c:/users/x/notas/a.md"), true, "separador e caixa do Windows");
  assert.equal(isSameOrInsidePath("/notas", "C:\\notas\\a.md"), false, "raiz relativa não contém caminho absoluto");
  assert.equal(isSameOrInsidePath("/notas", "/notas-velhas/a.md"), false);
  assert.equal(isSameOrInsidePath("/notas", "/outros/a.md"), false);
  assert.equal(isSameOrInsidePath("", "/notas/a.md"), false);
  assert.equal(isSameOrInsidePath("/notas", ""), false);
});
