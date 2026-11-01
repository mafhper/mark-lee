import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DocumentDraft, DraftStore } from "./drafts.ts";
import {
  createDraftKeeper,
  DRAFT_KEEPER_DEFAULTS,
  type DraftDocument,
  type DraftKeeperTimers,
} from "./draftKeeper.ts";

/* Seam: **quando** o rascunho é escrito e **o que** ele contém. Nada de React,
 * nada de disco real: o relógio é falso e a gravação é inspecionada.
 *
 * O contrato que importa aqui é o que o P0.4 ensinou no autosave: digitação
 * contínua não pode adiar a gravação para sempre, onda falha não pode virar
 * "salvo", e documento limpo não precisa de rascunho.
 */

class FakeClock implements DraftKeeperTimers {
  private sequence = 0;
  private current = 0;
  private readonly timeouts = new Map<number, { at: number; run: () => void }>();

  setTimeout(run: () => void, ms: number): unknown {
    const id = (this.sequence += 1);
    this.timeouts.set(id, { at: this.current + ms, run });
    return id;
  }

  clearTimeout(handle: unknown): void {
    this.timeouts.delete(handle as number);
  }

  async advance(ms: number): Promise<void> {
    const target = this.current + ms;
    for (let step = 0; step < 200; step += 1) {
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

  private nextDue(limit: number): { at: number; run: () => void; id: number } | null {
    let best: { at: number; run: () => void; id: number } | null = null;
    for (const [id, timer] of this.timeouts) {
      if (timer.at > limit) continue;
      if (!best || timer.at < best.at) best = { at: timer.at, run: timer.run, id };
    }
    if (!best) return null;
    this.timeouts.delete(best.id);
    return best;
  }
}

function drain(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

interface FakeDrafts {
  drafts: DocumentDraft[];
  removed: string[];
  /** Ordem das operações no "disco": é o que prova que a remoção veio depois da escrita. */
  log: string[];
  store: DraftStore;
  failNextWrites(count: number): void;
  holdWrites(): () => void;
}

function createFakeStore(): FakeDrafts {
  const drafts: DocumentDraft[] = [];
  const removed: string[] = [];
  const log: string[] = [];
  let failures = 0;
  let gate: Promise<void> | null = null;

  return {
    drafts,
    removed,
    log,
    failNextWrites(count) {
      failures = count;
    },
    holdWrites() {
      let release = () => {};
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => release();
    },
    store: {
      async write(draft) {
        if (gate) await gate;
        if (failures > 0) {
          failures -= 1;
          throw new Error("disco cheio");
        }
        drafts.push({ ...draft });
        log.push(`write:${draft.documentId}`);
      },
      async list() {
        return [];
      },
      async remove(documentId) {
        removed.push(documentId);
        log.push(`remove:${documentId}`);
        // O disco de verdade apaga o arquivo: sem isto, um rascunho gravado
        // **depois** da remoção continuaria parecendo vivo na asserção.
        const index = drafts.findIndex((draft) => draft.documentId === documentId);
        if (index >= 0) drafts.splice(index, 1);
      },
    },
  };
}

interface Harness {
  clock: FakeClock;
  fake: FakeDrafts;
  keeper: ReturnType<typeof createDraftKeeper>;
  set(id: string, patch: Partial<DraftDocument>): void;
  documents: Map<string, DraftDocument>;
}

function createHarness(documents: Record<string, Partial<DraftDocument>> = {}): Harness {
  const clock = new FakeClock();
  const fake = createFakeStore();
  const map = new Map<string, DraftDocument>();
  for (const [id, patch] of Object.entries(documents)) {
    map.set(id, {
      name: `${id}.md`,
      path: null,
      content: "conteúdo",
      dirty: true,
      diskHash: null,
      ...patch,
    });
  }

  const keeper = createDraftKeeper(
    {
      snapshot: (id) => map.get(id) ?? null,
      store: fake.store,
      now: () => 1_700_000_000_000,
    },
    { debounceMs: DRAFT_KEEPER_DEFAULTS.debounceMs },
    clock
  );

  return {
    clock,
    fake,
    keeper,
    documents: map,
    set(id, patch) {
      const current = map.get(id) ?? {
        name: `${id}.md`,
        path: null,
        content: "",
        dirty: true,
        diskHash: null,
      };
      map.set(id, { ...current, ...patch });
    },
  };
}

describe("guardião de rascunhos — agendamento", () => {
  it("grava o rascunho depois do silêncio, com o conteúdo do buffer", async () => {
    const h = createHarness({ "aba-1": { content: "primeira versão" } });

    h.keeper.note("aba-1");
    assert.equal(h.fake.drafts.length, 0, "gravar a cada tecla não é aceitável");

    await h.clock.advance(DRAFT_KEEPER_DEFAULTS.debounceMs);

    assert.equal(h.fake.drafts.length, 1);
    assert.deepEqual(h.fake.drafts[0], {
      documentId: "aba-1",
      name: "aba-1.md",
      path: null,
      content: "primeira versão",
      diskHash: null,
      dirty: true,
      origin: undefined,
      savedAt: 1_700_000_000_000,
    });
  });

  it("digitação contínua não adia a gravação para sempre", async () => {
    const h = createHarness({ "aba-1": {} });
    const half = DRAFT_KEEPER_DEFAULTS.debounceMs / 2;

    h.keeper.note("aba-1");
    await h.clock.advance(half);
    h.keeper.note("aba-1");
    await h.clock.advance(half);

    assert.equal(
      h.fake.drafts.length,
      1,
      "a segunda tecla reiniciou o relógio e o rascunho nunca chegou ao disco"
    );
  });

  it("documento limpo não gera rascunho: remove o que existia", async () => {
    const h = createHarness({ "aba-1": { dirty: false } });

    h.keeper.note("aba-1");
    await h.clock.advance(DRAFT_KEEPER_DEFAULTS.debounceMs);

    assert.equal(h.fake.drafts.length, 0);
    assert.deepEqual(h.fake.removed, ["aba-1"]);
  });

  it("flush grava na hora, sem esperar o silêncio", async () => {
    const h = createHarness({ "aba-1": { content: "antes de fechar" } });
    h.keeper.note("aba-1");

    const outcome = await h.keeper.flush("aba-1");

    assert.equal(outcome, "written");
    assert.equal(h.fake.drafts[0]?.content, "antes de fechar");
    await h.clock.advance(DRAFT_KEEPER_DEFAULTS.debounceMs);
    assert.equal(h.fake.drafts.length, 1, "o timer pendente gravou o rascunho duas vezes");
  });
});

describe("guardião de rascunhos — falha e recuperação", () => {
  it("falha de gravação mantém a promessa e tenta de novo", async () => {
    const h = createHarness({ "aba-1": { content: "texto em risco" } });
    h.fake.failNextWrites(1);

    h.keeper.note("aba-1");
    await h.clock.advance(DRAFT_KEEPER_DEFAULTS.debounceMs);
    assert.equal(h.fake.drafts.length, 0, "a falha não pode virar rascunho gravado");

    await h.clock.advance(DRAFT_KEEPER_DEFAULTS.debounceMs);

    assert.equal(h.fake.drafts.length, 1, "a segunda tentativa não aconteceu");
    assert.equal(h.fake.drafts[0]?.content, "texto em risco");
  });

  it("edição durante a escrita agenda outra rodada com o texto novo", async () => {
    const h = createHarness({ "aba-1": { content: "antes" } });
    const release = h.fake.holdWrites();

    h.keeper.note("aba-1");
    await h.clock.advance(DRAFT_KEEPER_DEFAULTS.debounceMs);
    h.set("aba-1", { content: "depois" });
    h.keeper.note("aba-1");
    release();
    await drain();

    await h.clock.advance(DRAFT_KEEPER_DEFAULTS.debounceMs);

    assert.deepEqual(
      h.fake.drafts.map((draft) => draft.content),
      ["antes", "depois"],
      "a edição que chegou durante o I/O não virou rascunho"
    );
  });

  it("flush durante a escrita espera e grava o texto que chegou", async () => {
    const h = createHarness({ "aba-1": { content: "antes" } });
    const release = h.fake.holdWrites();

    h.keeper.note("aba-1");
    await h.clock.advance(DRAFT_KEEPER_DEFAULTS.debounceMs);
    h.set("aba-1", { content: "depois" });
    h.keeper.note("aba-1");
    const flushing = h.keeper.flush("aba-1");
    release();

    assert.equal(await flushing, "written");
    assert.deepEqual(
      h.fake.drafts.map((draft) => draft.content),
      ["antes", "depois"],
      "o flush não esperou a gravação em curso e perdeu o texto novo"
    );
  });

  it("forget espera a gravação em voo: o rascunho descartado não ressuscita", async () => {
    // O defeito: `forget` apagava o arquivo enquanto uma gravação deste
    // documento ainda estava no disco. A gravação chegava depois e **recriava**
    // o rascunho de uma aba que o usuário já tinha fechado/salvo — texto
    // descartado voltando na próxima abertura.
    const h = createHarness({ "aba-1": { content: "texto descartado" } });
    const release = h.fake.holdWrites();

    h.keeper.note("aba-1");
    await h.clock.advance(DRAFT_KEEPER_DEFAULTS.debounceMs);
    assert.equal(h.fake.log.length, 0, "a escrita devia estar em voo, presa no disco falso");

    const forgetting = h.keeper.forget("aba-1");
    release();
    await forgetting;

    assert.deepEqual(
      h.fake.log,
      ["write:aba-1", "remove:aba-1"],
      "a remoção aconteceu antes da gravação em voo acabar"
    );
    assert.deepEqual(h.fake.drafts, [], "a gravação em voo recriou o rascunho depois do forget");
  });

  it("forget cancela o timer e apaga o rascunho", async () => {
    const h = createHarness({ "aba-1": {} });
    h.keeper.note("aba-1");

    await h.keeper.forget("aba-1");
    await h.clock.advance(DRAFT_KEEPER_DEFAULTS.debounceMs * 2);

    assert.deepEqual(h.fake.removed, ["aba-1"]);
    assert.equal(h.fake.drafts.length, 0, "um rascunho foi escrito depois do forget");
  });

  it("flushAll conta as falhas dos documentos pendentes", async () => {
    const h = createHarness({ "aba-1": {}, "aba-2": {} });
    h.fake.failNextWrites(1);
    h.keeper.note("aba-1");
    h.keeper.note("aba-2");

    const result = await h.keeper.flushAll();

    assert.equal(result.failures, 1);
    assert.equal(h.fake.drafts.length, 1);
  });

  it("documento fora da memória não grava rascunho novo", async () => {
    const h = createHarness({ "aba-1": {} });
    h.keeper.note("aba-1");
    h.documents.delete("aba-1");

    await h.clock.advance(DRAFT_KEEPER_DEFAULTS.debounceMs);

    assert.equal(h.fake.drafts.length, 0);
    assert.deepEqual(h.fake.removed, [], "não remover: o rascunho anterior é recuperação");
  });
});
