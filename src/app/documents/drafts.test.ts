import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DocumentTab } from "../../types.ts";
import {
  createDraftStore,
  DRAFT_SCHEMA_VERSION,
  mergeDraftRecovery,
  parseDraft,
  serializeDraft,
  type DocumentDraft,
  type DraftBackend,
  type StoredDraftPayload,
} from "./drafts.ts";

/* Seam dupla, e por um motivo:
 *
 * 1. **Armazenamento** — o formato do rascunho atravessa serialização, backend e
 *    volta; um campo perdido no caminho faria a recuperação mentir (por exemplo,
 *    perder `dirty` e adotar sobra de documento salvo).
 * 2. **Recuperação** — o que entra na lista de abas na abertura. É a regra que
 *    decide entre "o texto voltou" e "texto descartado voltou por engano".
 */

function draft(overrides: Partial<DocumentDraft> = {}): DocumentDraft {
  return {
    documentId: "aba-1",
    name: "a.md",
    path: "/notas/a.md",
    content: "texto não salvo",
    diskHash: null,
    dirty: true,
    savedAt: 10,
    ...overrides,
  };
}

function tab(overrides: Partial<DocumentTab> = {}): DocumentTab {
  return {
    id: "aba-1",
    name: "a.md",
    path: "/notas/a.md",
    content: "texto salvo",
    dirty: false,
    ...overrides,
  };
}

function memoryBackend(initial: StoredDraftPayload[] = []): DraftBackend & {
  entries: Map<string, string>;
  removed: string[];
} {
  const entries = new Map(initial.map((entry) => [entry.document_id, entry.payload]));
  const removed: string[] = [];
  return {
    entries,
    removed,
    async write(documentId, payload) {
      entries.set(documentId, payload);
    },
    async list() {
      return [...entries].map(([document_id, payload]) => ({ document_id, payload }));
    },
    async remove(documentId) {
      removed.push(documentId);
      entries.delete(documentId);
    },
  };
}

describe("rascunho durável — formato e armazenamento", () => {
  it("grava e reidrata todos os campos que a recuperação usa", async () => {
    const backend = memoryBackend();
    const store = createDraftStore(backend);
    const original = draft({ origin: "workspace", diskHash: "abc123" });

    await store.write(original);
    const restored = await store.list();

    assert.deepEqual(restored, [original]);
    assert.equal(JSON.parse(backend.entries.get("aba-1") as string).schemaVersion, DRAFT_SCHEMA_VERSION);
  });

  it("o identificador vem do arquivo, nunca do payload", () => {
    const payload = JSON.stringify({
      schemaVersion: DRAFT_SCHEMA_VERSION,
      documentId: "outro-id",
      name: "a.md",
      path: null,
      content: "x",
      dirty: true,
      savedAt: 1,
    });

    const parsed = parseDraft("aba-1", payload);

    assert.equal(parsed?.documentId, "aba-1");
  });

  it("payload corrompido ou de versão desconhecida é ignorado, não apagado", async () => {
    const valid = serialized(draft({ documentId: "aba-valida" }));
    const unknownVersion = JSON.stringify({
      schemaVersion: DRAFT_SCHEMA_VERSION + 1,
      content: "de uma versão futura",
      dirty: true,
      savedAt: 1,
    });
    const backend = memoryBackend([
      { document_id: "aba-valida", payload: valid },
      { document_id: "aba-corrompida", payload: "{ nem json é" },
      { document_id: "aba-futura", payload: unknownVersion },
      { document_id: "aba-sem-conteudo", payload: JSON.stringify({ schemaVersion: 1, dirty: true }) },
    ]);
    const store = createDraftStore(backend);

    const restored = await store.list();

    assert.deepEqual(restored.map((entry) => entry.documentId), ["aba-valida"]);
    assert.deepEqual(backend.removed, [], "a leitura apagou rascunho que não entendeu");
    assert.equal(backend.entries.size, 4, "a leitura apagou arquivo do backend");
  });

  it("remove apaga no backend", async () => {
    const backend = memoryBackend([{ document_id: "aba-1", payload: serialized(draft()) }]);
    const store = createDraftStore(backend);

    await store.remove("aba-1");

    assert.deepEqual(backend.removed, ["aba-1"]);
    assert.equal((await store.list()).length, 0);
  });
});

describe("recuperação na abertura", () => {
  it("adota o rascunho sobre a aba do cache", () => {
    const result = mergeDraftRecovery([tab()], [draft()]);

    assert.deepEqual(result.adopted, ["aba-1"]);
    assert.deepEqual(result.restored, []);
    assert.equal(result.tabs.length, 1);
    assert.equal(result.tabs[0].content, "texto não salvo");
    assert.equal(result.tabs[0].dirty, true);
    assert.equal(result.tabs[0].path, "/notas/a.md");
    assert.equal(result.newest, "aba-1");
  });

  it("recria a aba que o cache perdeu", () => {
    const result = mergeDraftRecovery(
      [],
      [draft({ documentId: "aba-9", name: "sem-caminho.md", path: null, origin: "untitled" })]
    );

    assert.deepEqual(result.restored, ["aba-9"]);
    assert.deepEqual(result.tabs, [
      {
        id: "aba-9",
        name: "sem-caminho.md",
        path: null,
        content: "texto não salvo",
        dirty: true,
        origin: "untitled",
      },
    ]);
  });

  it("rascunho de documento limpo é descartado e não traz texto de volta", () => {
    const result = mergeDraftRecovery([tab()], [draft({ dirty: false, content: "descartado" })]);

    assert.deepEqual(result.dropped, ["aba-1"]);
    assert.deepEqual(result.adopted, []);
    assert.deepEqual(result.tabs, [tab()]);
    assert.equal(result.newest, null);
  });

  it("conteúdo igual ao cache não duplica aba nem inventa adoção", () => {
    const result = mergeDraftRecovery([tab({ content: "igual", dirty: true })], [draft({ content: "igual" })]);

    assert.deepEqual(result.adopted, []);
    assert.deepEqual(result.restored, []);
    assert.equal(result.tabs.length, 1);
    assert.equal(result.tabs[0].content, "igual");
    assert.deepEqual(result.dropped, [], "rascunho de aba suja ainda é a garantia do texto");
  });

  it("rascunho de aba limpa com o mesmo texto é sobra e é descartado", () => {
    const result = mergeDraftRecovery([tab({ content: "igual", dirty: false })], [draft({ content: "igual" })]);

    assert.deepEqual(result.dropped, ["aba-1"]);
    assert.deepEqual(result.adopted, []);
    assert.equal(result.tabs[0].dirty, false);
  });

  it("preserva a ordem das abas do cache e limpa selo de conflito antigo", () => {
    const cached = [
      tab({ id: "aba-1", name: "a.md" }),
      tab({ id: "aba-2", name: "b.md", path: "/notas/b.md", conflictedExternally: true }),
    ];
    const result = mergeDraftRecovery(cached, [
      draft({ documentId: "aba-2", name: "b.md", path: "/notas/b.md", content: "novo b" }),
    ]);

    assert.deepEqual(result.tabs.map((entry) => entry.id), ["aba-1", "aba-2"]);
    assert.equal(result.tabs[1].content, "novo b");
    assert.equal(result.tabs[1].conflictedExternally, false);
  });

  it("o mais recente entre os rascunhos recuperados vira a aba em foco", () => {
    const result = mergeDraftRecovery(
      [],
      [
        draft({ documentId: "antiga", savedAt: 1, path: null }),
        draft({ documentId: "recente", savedAt: 50, path: null }),
        draft({ documentId: "meio", savedAt: 20, path: null }),
      ]
    );

    assert.equal(result.newest, "recente");
    assert.deepEqual(result.tabs.map((entry) => entry.id), ["antiga", "meio", "recente"]);
  });
});

function serialized(value: DocumentDraft): string {
  return serializeDraft(value);
}
