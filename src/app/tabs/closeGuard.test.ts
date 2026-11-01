import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextActiveId, runClose, type CloseCandidate, type CloseDecision } from "./closeGuard.ts";
import type { SaveOutcome } from "../../services/documents.ts";

/* A guarda de fechamento é testada **de fora**, com as três colaborações
 * injetadas: quem pergunta (`ask`), quem grava (`save`) e quem aplica (`close`).
 * O teste não simula React nem `window.confirm`; ele fixa o contrato do
 * ML-H04/P0.2/P0.3 — só fecha em `saved` ou `discard`, e só depois de cada
 * decisão do lote estar tomada. Os valores esperados vêm do plano, não da
 * implementação. */

interface Aba extends CloseCandidate {
  content: string;
}

const abaLimpa = (id: string): Aba => ({
  id,
  name: `${id}.md`,
  dirty: false,
  content: `conteúdo de ${id}`,
});

const abaSuja = (id: string): Aba => ({
  id,
  name: `${id}.md`,
  dirty: true,
  content: `conteúdo não salvo de ${id}`,
});

/** Registra o que a guarda pediu a cada colaboração, na ordem em que pediu. */
function espiao(decisoes: Record<string, CloseDecision | null>, outcome: SaveOutcome) {
  const chamadas: string[] = [];
  const fechadas: string[][] = [];
  const decision = (tab: CloseCandidate): CloseDecision => {
    chamadas.push(`ask:${tab.id}`);
    return decisoes[tab.id] ?? "cancel";
  };
  return {
    chamadas,
    fechadas,
    deps: {
      ask: async (tab: CloseCandidate) => decision(tab),
      save: async (tab: CloseCandidate): Promise<SaveOutcome> => {
        chamadas.push(`save:${tab.id}`);
        return outcome;
      },
      close: (ids: readonly string[]) => {
        chamadas.push(`close:${ids.join(",")}`);
        fechadas.push([...ids]);
      },
    },
  };
}

describe("runClose — aba limpa", () => {
  it("fecha sem perguntar e sem gravar", async () => {
    const spy = espiao({}, { kind: "saved", documentId: "a", revision: 1, diskHash: "x" });

    const result = await runClose([abaLimpa("a")], spy.deps);

    assert.deepEqual(result, { closed: ["a"], kept: [], cancelled: false });
    assert.deepEqual(spy.chamadas, ["close:a"]);
  });
});

describe("runClose — aba suja", () => {
  it("Cancelar preserva a aba, sem gravar e sem fechar", async () => {
    const spy = espiao({ a: "cancel" }, { kind: "saved", documentId: "a", revision: 1, diskHash: "x" });

    const result = await runClose([abaSuja("a")], spy.deps);

    assert.deepEqual(result, { closed: [], kept: ["a"], cancelled: true });
    assert.deepEqual(spy.chamadas, ["ask:a"], "cancelar não pode gravar nem fechar");
  });

  it("Descartar fecha sem passar pela gravação", async () => {
    const spy = espiao({ a: "discard" }, { kind: "saved", documentId: "a", revision: 1, diskHash: "x" });

    const result = await runClose([abaSuja("a")], spy.deps);

    assert.deepEqual(result, { closed: ["a"], kept: [], cancelled: false });
    assert.deepEqual(spy.chamadas, ["ask:a", "close:a"]);
  });
});

describe("runClose — `Salvar` só fecha quando a gravação aconteceu", () => {
  it("`saved` grava antes de fechar", async () => {
    const spy = espiao({ a: "save" }, { kind: "saved", documentId: "a", revision: 1, diskHash: "x" });

    const result = await runClose([abaSuja("a")], spy.deps);

    assert.deepEqual(result, { closed: ["a"], kept: [], cancelled: false });
    assert.deepEqual(spy.chamadas, ["ask:a", "save:a", "close:a"]);
  });

  it("`cancelled` (`Salvar como` cancelado) mantém a aba aberta", async () => {
    const spy = espiao({ a: "save" }, { kind: "cancelled" });

    const result = await runClose([abaSuja("a")], spy.deps);

    assert.deepEqual(result, { closed: [], kept: ["a"], cancelled: true });
    assert.deepEqual(spy.chamadas, ["ask:a", "save:a"], "nada é fechado");
  });

  it("`failed` mantém a aba aberta e não reporta cancelamento", async () => {
    const spy = espiao({ a: "save" }, { kind: "failed", reason: "arquivo bloqueado" });

    const result = await runClose([abaSuja("a")], spy.deps);

    assert.deepEqual(result, { closed: [], kept: ["a"], cancelled: false });
    assert.deepEqual(spy.chamadas, ["ask:a", "save:a"]);
  });

  it("`conflict` mantém a aba aberta sem sobrescrever o disco", async () => {
    const spy = espiao({ a: "save" }, { kind: "conflict", diskHash: "disco", expectedHash: "sessao" });

    const result = await runClose([abaSuja("a")], spy.deps);

    assert.deepEqual(result, { closed: [], kept: ["a"], cancelled: false });
    assert.deepEqual(spy.chamadas, ["ask:a", "save:a"]);
  });
});

describe("runClose — lote", () => {
  /** Lote de três: a primeira suja manda salvar, a segunda cancela, a terceira está limpa. */
  it("Cancelar na segunda aba não fecha nem grava nenhuma outra", async () => {
    const spy = espiao({ a: "save", b: "cancel" }, { kind: "saved", documentId: "a", revision: 1, diskHash: "x" });

    const result = await runClose([abaSuja("a"), abaSuja("b"), abaLimpa("c")], spy.deps);

    assert.deepEqual(result, { closed: [], kept: ["a", "b", "c"], cancelled: true });
    assert.deepEqual(
      spy.chamadas,
      ["ask:a", "ask:b"],
      "decisão coletada antes de aplicar: nem a aba limpa pode ter fechado"
    );
  });

  it("Gravação que falha aborta o lote inteiro", async () => {
    const spy = espiao({ a: "save" }, { kind: "failed", reason: "sem espaço" });

    const result = await runClose([abaSuja("a"), abaLimpa("b")], spy.deps);

    assert.deepEqual(result, { closed: [], kept: ["a", "b"], cancelled: false });
    assert.deepEqual(spy.chamadas, ["ask:a", "save:a"]);
  });

  it("Todas resolvidas: fecha na ordem recebida, de uma vez", async () => {
    const spy = espiao({ a: "discard", b: "save" }, { kind: "saved", documentId: "b", revision: 2, diskHash: "y" });

    const result = await runClose([abaSuja("a"), abaLimpa("c"), abaSuja("b")], spy.deps);

    assert.deepEqual(result, { closed: ["a", "c", "b"], kept: [], cancelled: false });
    assert.deepEqual(spy.chamadas, ["ask:a", "ask:b", "save:b", "close:a,c,b"]);
  });
});

describe("nextActiveId — para onde vai o foco quando a aba ativa fecha", () => {
  const lista = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("mantém a aba ativa quando ela não foi fechada", () => {
    assert.equal(nextActiveId(lista, ["c"], "a"), "a");
  });

  it("cai para a aba à esquerda, como o fechamento sempre fez", () => {
    assert.equal(nextActiveId(lista, ["b"], "b"), "a");
  });

  it("na primeira aba, cai para a seguinte", () => {
    assert.equal(nextActiveId(lista, ["a"], "a"), "b");
  });

  it("pula as abas que também foram fechadas", () => {
    assert.equal(nextActiveId(lista, ["a", "b"], "b"), "c");
  });

  it("sem sobra, não há aba ativa", () => {
    assert.equal(nextActiveId(lista, ["a", "b", "c"], "c"), null);
  });

  it("sem aba ativa, continua sem", () => {
    assert.equal(nextActiveId(lista, ["a"], null), null);
  });
});
