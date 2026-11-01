import assert from "node:assert/strict";
import test from "node:test";

import { createPendingWorkRegistry } from "./pendingWork.ts";

/* Seam: o **registro de trabalho prometido** do coordenador de ciclo de vida
 * (`ML-H06`, P0.3). O editor tinha o seu `flush` injetado, o diário tinha um
 * registro próprio em `features/editor/active-target.ts` e cada saída nova
 * precisava lembrar de somar os dois — que é exatamente o defeito que o P0.3
 * descreve. Aqui se prova a regra do registro, de fora: o coordenador só precisa
 * consultá-lo; quem prometeu trabalho não precisa saber quem vai sair.
 */

test("o que foi registrado é descarregado", async () => {
  const registry = createPendingWorkRegistry();
  const flushed: string[] = [];

  registry.register({ label: "journal-entry", flush: () => { flushed.push("journal-entry"); } });
  registry.register({ label: "drafts", flush: () => { flushed.push("drafts"); } });

  const result = await registry.flushAll();

  assert.deepEqual(flushed.sort(), ["drafts", "journal-entry"]);
  assert.equal(result.failures, 0);
  assert.deepEqual([...registry.list()].sort(), ["drafts", "journal-entry"]);
});

test("cancelar o registro tira a superfície da saída", async () => {
  const registry = createPendingWorkRegistry();
  let called = 0;

  const dispose = registry.register({ label: "journal-entry", flush: () => { called += 1; } });

  await registry.flushAll();
  assert.equal(called, 1);

  dispose();
  await registry.flushAll();

  assert.equal(called, 1, "a superfície desmontada voltou a ser descarregada");
  assert.deepEqual(registry.list(), []);
});

test("flusher que devolve false conta como falha, void/true não", async () => {
  const registry = createPendingWorkRegistry();

  registry.register({ label: "ok-void", flush: () => undefined });
  registry.register({ label: "ok-true", flush: () => true });
  registry.register({ label: "falhou", flush: () => false });

  const result = await registry.flushAll();

  assert.equal(result.failures, 1);
});

test("flusher que estoura conta como falha e não impede os outros", async () => {
  const registry = createPendingWorkRegistry();
  const flushed: string[] = [];

  registry.register({ label: "estoura", flush: () => { throw new Error("disco cheio"); } });
  registry.register({
    label: "dessincronizado",
    flush: async () => {
      flushed.push("dessincronizado");
      return true;
    },
  });

  const result = await registry.flushAll();

  assert.equal(result.failures, 1);
  assert.deepEqual(flushed, ["dessincronizado"], "um flusher estourado cancelou os seguintes");
});

test("registro vazio não falha e não trava a saída", async () => {
  const registry = createPendingWorkRegistry();

  const result = await registry.flushAll();

  assert.equal(result.failures, 0);
  assert.deepEqual(registry.list(), []);
});

test("registrar a mesma superfície duas vezes não a descarrega duas vezes", async () => {
  // O painel de entrada re-registra a cada `flushPendingSave` novo (a identidade
  // muda com o callback). O que não pode acontecer é o mesmo trabalho entrar
  // duas vezes na mesma saída e a gravação ser pedida em dobro.
  const registry = createPendingWorkRegistry();
  let called = 0;
  const flush = () => { called += 1; };

  registry.register({ label: "journal-entry", flush });
  const dispose = registry.register({ label: "journal-entry", flush });

  await registry.flushAll();

  assert.equal(called, 1, "o mesmo trabalho foi prometido duas vezes");
  dispose();
});
