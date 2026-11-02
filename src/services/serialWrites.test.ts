import assert from "node:assert/strict";
import test from "node:test";

import { createSerialWrites } from "./serialWrites.ts";

/* Seam: a **fila serial por caminho**. Ela existe para dar às Memórias a mesma
 * garantia que o `DocumentSession` já dá ao editor — uma escrita por documento,
 * nunca duas ao mesmo tempo — no formato que um read-modify-write precisa.
 *
 * O que se prova aqui é a ordem e o isolamento; a fiação (quem usa a fila) é
 * provada nos testes de fonte das Memórias, porque esses módulos falam com o
 * Tauri e não rodam fora do desktop.
 */

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

test("duas tarefas no mesmo caminho não se sobrepõem e mantêm a ordem", async () => {
  const writes = createSerialWrites();
  const events: string[] = [];
  const gate = deferred();

  const first = writes.run("/notas/a.md", async () => {
    events.push("inicio:1");
    await gate.promise;
    events.push("fim:1");
    return 1;
  });
  const second = writes.run("/notas/a.md", async () => {
    events.push("inicio:2");
    return 2;
  });

  assert.deepEqual(events, ["inicio:1"], "a segunda tarefa começou antes da primeira terminar");

  gate.resolve();
  assert.equal(await first, 1);
  assert.equal(await second, 2);
  assert.deepEqual(events, ["inicio:1", "fim:1", "inicio:2"]);
});

test("caminhos diferentes não se esperam", async () => {
  const writes = createSerialWrites();
  const events: string[] = [];
  const gate = deferred();

  const blocked = writes.run("/notas/a.md", async () => {
    events.push("a:inicio");
    await gate.promise;
    events.push("a:fim");
  });
  await writes.run("/notas/b.md", async () => {
    events.push("b:inicio");
  });

  assert.deepEqual(events, ["a:inicio", "b:inicio"], "documentos distintos ficaram na mesma fila");

  gate.resolve();
  await blocked;
  assert.deepEqual(events, ["a:inicio", "b:inicio", "a:fim"]);
});

test("a falha de uma tarefa não envenena a fila do caminho", async () => {
  const writes = createSerialWrites();
  const gate = deferred();

  const failing = writes.run("/notas/a.md", async () => {
    await gate.promise;
    throw new Error("disco cheio");
  });
  const after = writes.run("/notas/a.md", async () => "ok");

  gate.resolve();
  await assert.rejects(failing, /disco cheio/);
  assert.equal(await after, "ok", "a tarefa seguinte nunca rodou");
});

test("read-modify-write enfileirado não perde atualização", async () => {
  // O defeito que a fila fecha: três chamadas concorrentes leem o mesmo valor,
  // incrementam e gravam — sem ordem, duas gravam "1" e o disco perde uma.
  const writes = createSerialWrites();
  let disk = "0";

  const bump = () =>
    writes.run("/caderno/.marklee/journal.json", async () => {
      const current = Number(disk);
      await tick();
      disk = String(current + 1);
      return disk;
    });

  await Promise.all([bump(), bump(), bump()]);

  assert.equal(disk, "3", "duas atualizações concorrentes perderam a primeira");
});

test("pending diz se o caminho tem trabalho na fila", async () => {
  const writes = createSerialWrites();
  const gate = deferred();

  assert.equal(writes.pending("/notas/a.md"), false);
  const run = writes.run("/notas/a.md", () => gate.promise);
  assert.equal(writes.pending("/notas/a.md"), true);

  gate.resolve();
  await run;
  await tick();
  assert.equal(writes.pending("/notas/a.md"), false, "a fila do caminho ficou esquecida");
});
