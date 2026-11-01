import assert from "node:assert/strict";
import test from "node:test";

import { createDocumentSessions, type DocumentIo } from "../../services/documents.ts";
import {
  createDocumentAutosaveScheduler,
  type AutosaveDocument,
  type AutosaveOptions,
  type AutosaveState,
  type AutosaveTimers,
} from "./autosaveScheduler.ts";

/* Seam: o **contrato do agendador** com a sessão de documento (ML-H03) e com o
 * relógio. Nada de React, nada de `invoke`, nada de espera real.
 *
 * A sessão usada aqui é a de verdade (`createDocumentSessions`), sobre um disco
 * falso. Isso é deliberado: o defeito do P0.4 mora exatamente na fronteira entre
 * "a escrita terminou" e "o documento está salvo", e testar o agendador contra
 * um `savedRevision` de mentira provaria só que o mock concorda consigo mesmo.
 */

class FakeClock implements AutosaveTimers {
  private sequence = 0;
  private current = 0;
  private readonly timeouts = new Map<number, { at: number; run: () => void }>();
  private readonly intervals = new Map<number, { due: number; every: number; run: () => void }>();

  setTimeout(run: () => void, ms: number): unknown {
    const id = (this.sequence += 1);
    this.timeouts.set(id, { at: this.current + ms, run });
    return id;
  }

  clearTimeout(handle: unknown): void {
    this.timeouts.delete(handle as number);
  }

  setInterval(run: () => void, ms: number): unknown {
    const id = (this.sequence += 1);
    this.intervals.set(id, { due: this.current + ms, every: ms, run });
    return id;
  }

  clearInterval(handle: unknown): void {
    this.intervals.delete(handle as number);
  }

  /** Avança o tempo executando timers em ordem, drenando promessas entre eles. */
  async advance(ms: number): Promise<void> {
    const target = this.current + ms;
    for (let step = 0; step < 500; step += 1) {
      await drain();
      const due = this.nextDue(target);
      if (!due) {
        this.current = target;
        await drain();
        return;
      }
      this.current = due.at;
      due.run();
    }
    throw new Error("fake clock: o avanço não convergiu (timer se reagendando sem parar?)");
  }

  private nextDue(limit: number): { at: number; run: () => void } | null {
    let best: { at: number; run: () => void; kind: "timeout" | "interval"; id: number } | null = null;

    for (const [id, timer] of this.timeouts) {
      if (timer.at > limit) continue;
      if (!best || timer.at < best.at) best = { at: timer.at, run: timer.run, kind: "timeout", id };
    }
    for (const [id, timer] of this.intervals) {
      if (timer.due > limit) continue;
      if (!best || timer.due < best.at) best = { at: timer.due, run: timer.run, kind: "interval", id };
    }
    if (!best) return null;

    if (best.kind === "timeout") {
      this.timeouts.delete(best.id);
    } else {
      const timer = this.intervals.get(best.id);
      if (timer) timer.due += timer.every;
    }
    return { at: best.at, run: best.run };
  }
}

function drain(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

interface Disk {
  files: Map<string, string>;
  writes: Array<{ path: string; content: string }>;
  io: DocumentIo;
  /** Segura as escritas até o `release` devolvido ser chamado. */
  block(): () => void;
  failNextWrites(count: number): void;
}

function createDisk(): Disk {
  const files = new Map<string, string>();
  const writes: Array<{ path: string; content: string }> = [];
  let gate: Promise<void> | null = null;
  let failures = 0;

  const io: DocumentIo = {
    async readText(path) {
      const value = files.get(path);
      if (value === undefined) throw new Error("arquivo ausente");
      return value;
    },
    async writeText(path, content) {
      if (gate) await gate;
      if (failures > 0) {
        failures -= 1;
        throw new Error("disco cheio");
      }
      files.set(path, content);
      writes.push({ path, content });
    },
  };

  return {
    files,
    writes,
    io,
    block() {
      let release!: () => void;
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => {
        gate = null;
        release();
      };
    },
    failNextWrites(count) {
      failures = count;
    },
  };
}

interface Harness {
  clock: FakeClock;
  disk: Disk;
  scheduler: ReturnType<typeof createDocumentAutosaveScheduler>;
  states: AutosaveState[];
  open(id: string, path: string | null, content: string): void;
  /** Simula a digitação: texto novo na aba, revisão nova na sessão, aviso ao agendador. */
  type(id: string, content: string): void;
  clean(id: string): boolean;
  lastState(id: string): AutosaveState | undefined;
}

function createHarness(options: Partial<AutosaveOptions> = {}): Harness {
  const disk = createDisk();
  const sessions = createDocumentSessions(disk.io);
  const documents = new Map<string, AutosaveDocument>();
  const states: AutosaveState[] = [];
  const clock = new FakeClock();

  const scheduler = createDocumentAutosaveScheduler(
    {
      snapshot: (documentId) => documents.get(documentId) ?? null,
      session: (documentId) => sessions.forDocument(documentId),
      publish: (state) => states.push(state),
    },
    { debounceMs: 2000, intervalMs: 60_000, retryDelayMs: 1000, maxRetries: 2, ...options },
    clock
  );

  return {
    clock,
    disk,
    scheduler,
    states,
    open(id, path, content) {
      documents.set(id, { path, content });
      if (path) {
        disk.files.set(path, content);
        sessions.forDocument(id).trackDisk(path, content);
      }
    },
    type(id, content) {
      const current = documents.get(id);
      documents.set(id, { path: current?.path ?? null, content });
      sessions.forDocument(id).noteEdit();
      scheduler.note(id);
    },
    clean(id) {
      return !sessions.forDocument(id).isDirty;
    },
    lastState(id) {
      return [...states].reverse().find((state) => state.documentId === id);
    },
  };
}

test("uma gravação por documento, e só depois do debounce", async () => {
  const harness = createHarness();
  harness.open("a", "/notas/a.md", "texto original");

  harness.type("a", "texto editado");
  assert.equal(harness.scheduler.state("a").phase, "pending");

  await harness.clock.advance(1999);
  assert.equal(harness.disk.writes.length, 0, "gravou antes do silêncio que o debounce pede");

  await harness.clock.advance(1);
  assert.equal(harness.disk.writes.length, 1);
  assert.equal(harness.disk.files.get("/notas/a.md"), "texto editado");
  assert.equal(harness.scheduler.state("a").phase, "saved");
  assert.equal(harness.clean("a"), true);
});

test("tecla durante a digitação reinicia só o relógio daquele documento", async () => {
  const harness = createHarness();
  harness.open("a", "/notas/a.md", "v0");
  harness.open("b", "/notas/b.md", "b0");

  harness.type("a", "v1");
  await harness.clock.advance(1500);
  harness.type("a", "v2");
  await harness.clock.advance(1500);
  assert.equal(harness.disk.writes.length, 0, "o debounce não foi reiniciado pela segunda tecla");

  await harness.clock.advance(500);
  assert.equal(harness.disk.writes.length, 1);
  assert.equal(harness.disk.files.get("/notas/a.md"), "v2", "gravou a versão intermediária");
  assert.equal(harness.disk.files.get("/notas/b.md"), "b0", "o documento b foi escrito sem edição");
});

test("edição durante o I/O não marca o documento como salvo", async () => {
  const harness = createHarness();
  harness.open("a", "/notas/a.md", "v1");

  harness.type("a", "v1 editado");
  const release = harness.disk.block();
  await harness.clock.advance(2000);
  assert.equal(harness.scheduler.state("a").phase, "saving");

  // A tecla chega enquanto o disco ainda não respondeu.
  harness.type("a", "v1 editado com mais texto");
  release();
  await drain();
  await drain();

  const reported = harness.states.filter((state) => state.documentId === "a");
  assert.equal(
    reported.some((state) => state.phase === "saved"),
    false,
    "publicou `saved` com uma edição que o disco não tem",
  );
  assert.equal(harness.scheduler.state("a").phase, "pending");
  assert.equal(harness.clean("a"), false, "a sessão ficou limpa sem o disco ter o texto atual");

  // O texto da edição perdida continua sendo o que a próxima rodada escreve.
  await harness.clock.advance(2000);
  assert.equal(harness.disk.files.get("/notas/a.md"), "v1 editado com mais texto");
  assert.equal(harness.scheduler.state("a").phase, "saved");
  assert.equal(harness.clean("a"), true);
});

test("falha vira estado explícito e a repetição é automática e limitada", async () => {
  const harness = createHarness({ maxRetries: 1 });
  harness.open("a", "/notas/a.md", "v1");
  harness.disk.failNextWrites(1);

  harness.type("a", "v2");
  await harness.clock.advance(2000);

  const failed = harness.scheduler.state("a");
  assert.equal(failed.phase, "failed");
  assert.equal(failed.reason, "disco cheio");
  assert.equal(failed.attempts, 1);
  assert.equal(harness.disk.writes.length, 0);

  await harness.clock.advance(1000);
  assert.equal(harness.disk.files.get("/notas/a.md"), "v2", "a repetição não gravou o texto pendente");
  assert.equal(harness.scheduler.state("a").phase, "saved");
  assert.equal(harness.scheduler.state("a").attempts, 0);
});

test("falha sem repetição sobrando espera um pedido explícito", async () => {
  const harness = createHarness({ maxRetries: 0 });
  harness.open("a", "/notas/a.md", "v1");
  harness.disk.failNextWrites(1);

  harness.type("a", "v2");
  await harness.clock.advance(2000);
  assert.equal(harness.scheduler.state("a").phase, "failed");

  // A janela do retry (1 s) passa sem nada acontecer: sem tentativa sobrando,
  // quem decide repetir é um pedido explícito — o intervalo ainda cobre o caso,
  // mas com a cadência dele, não em laço.
  await harness.clock.advance(1000);
  assert.equal(harness.disk.writes.length, 0, "repetiu sem ninguém pedir, além do limite");

  const outcome = await harness.scheduler.flush("a");
  assert.equal(outcome, "saved");
  assert.equal(harness.disk.files.get("/notas/a.md"), "v2");
});

test("um pedido que chega durante o I/O não abre uma segunda escrita", async () => {
  const harness = createHarness();
  harness.open("a", "/notas/a.md", "v1");

  harness.type("a", "v2");
  const release = harness.disk.block();
  await harness.clock.advance(2000);
  assert.equal(harness.disk.writes.length, 0);
  assert.equal(harness.scheduler.state("a").phase, "saving");

  harness.type("a", "v3");
  const duringFlight = await harness.scheduler.flush("a");
  assert.equal(duringFlight, "skipped", "o agendador abriu uma escrita concorrente");

  release();
  await drain();
  await drain();
  assert.equal(harness.disk.writes.length, 1);

  await harness.clock.advance(2000);
  assert.equal(harness.disk.files.get("/notas/a.md"), "v3");
});

test("o intervalo salva quem não para de digitar", async () => {
  const harness = createHarness({ debounceMs: 2000, intervalMs: 5000 });
  harness.open("a", "/notas/a.md", "v0");

  // Uma tecla a cada 500 ms: o debounce de 2 s nunca fecha sozinho.
  for (let index = 1; index <= 10; index += 1) {
    harness.type("a", `v${index}`);
    await harness.clock.advance(500);
  }

  assert.ok(harness.disk.writes.length >= 1, "digitação contínua adiou o autosave para sempre");
  assert.equal(harness.disk.files.get("/notas/a.md"), "v10");
});

test("documento sem caminho não é escrito, e desligar não grava nada", async () => {
  const harness = createHarness();
  harness.open("novo", null, "");

  harness.type("novo", "primeiro texto");
  await harness.clock.advance(2000);
  assert.equal(harness.disk.writes.length, 0, "autosave inventou um destino");
  assert.equal(harness.scheduler.state("novo").phase, "pending");

  harness.scheduler.updateOptions({ enabled: false });
  harness.type("novo", "segundo texto");
  await harness.clock.advance(120_000);

  const flushed = await harness.scheduler.flushAll();
  assert.deepEqual(flushed, { failures: 0 });
  assert.equal(harness.disk.writes.length, 0, "escreveu com o autosave desligado");
});

test("flushAll grava o que está prometido e conta só falha de disco", async () => {
  const harness = createHarness();
  harness.open("a", "/notas/a.md", "a0");
  harness.open("b", "/notas/b.md", "b0");

  harness.type("a", "a1");
  harness.type("b", "b1");
  const flushed = await harness.scheduler.flushAll();

  assert.deepEqual(flushed, { failures: 0 });
  assert.equal(harness.disk.files.get("/notas/a.md"), "a1");
  assert.equal(harness.disk.files.get("/notas/b.md"), "b1");
});
