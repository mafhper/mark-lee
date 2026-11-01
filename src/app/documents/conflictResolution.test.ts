import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDocumentSessions,
  fingerprintContent,
  type DocumentIo,
} from "../../services/documents.ts";
import {
  loadDiskVersion,
  resolveConflict,
  type ConflictDeps,
  type ConflictDocument,
} from "./conflictResolution.ts";

/* Seam: **o efeito de cada ação do diálogo sobre o disco e sobre a sessão**.
 *
 * O modal não é o risco; o risco é o que acontece depois do clique. Por isso a
 * sessão usada aqui é a de verdade (ML-H03) sobre um disco falso que também sabe
 * criar arquivo exclusivo — se o teste usasse uma sessão de mentira, ele provaria
 * que o mock concorda consigo mesmo.
 */

interface FakeDisk {
  files: Map<string, string>;
  reads: string[];
  /** Escritas de substituição (`io.writeText`). */
  writes: string[];
  /** Criações exclusivas (`create_new`). */
  creations: string[];
  deps: (options?: { copyPath?: string | null }) => ConflictDeps;
  sessions: ReturnType<typeof createDocumentSessions>;
  failNextReads(count: number): void;
}

function createFakeDisk(initial: Record<string, string> = {}): FakeDisk {
  const files = new Map(Object.entries(initial));
  const reads: string[] = [];
  const writes: string[] = [];
  const creations: string[] = [];
  let readFailures = 0;

  const io: DocumentIo = {
    async readText(path) {
      reads.push(path);
      if (readFailures > 0) {
        readFailures -= 1;
        throw new Error(`permission denied: ${path}`);
      }
      const value = files.get(path);
      if (value === undefined) throw new Error(`not found: ${path}`);
      return value;
    },
    async writeText(path, content) {
      writes.push(path);
      files.set(path, content);
    },
  };

  const sessions = createDocumentSessions(io);

  return {
    files,
    reads,
    writes,
    creations,
    sessions,
    deps(options = {}) {
      return {
        readDisk: io.readText,
        chooseCopyPath: async () => (options.copyPath === undefined ? null : options.copyPath),
        createExclusive: async (path, content) => {
          if (files.has(path)) {
            // O mesmo erro do `create_new` do Rust: o destino ocupado nunca é tocado.
            throw new Error(`destination already exists: ${path}`);
          }
          creations.push(path);
          files.set(path, content);
        },
        session: (documentId) => sessions.forDocument(documentId),
      };
    },
    blockNextReads() {
      let release = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const original = io.readText;
      io.readText = async (path) => {
        await gate;
        return original(path);
      };
      return () => {
        io.readText = original;
        release();
      };
    },
    failNextReads(count) {
      readFailures = count;
    },
  };
}

function conflictingDocument(disk: FakeDisk, buffer = "a minha versão"): ConflictDocument {
  const session = disk.sessions.forDocument("aba-1");
  session.trackDisk("/notas/a.md", "versão-base");
  session.noteEdit();
  // Outro programa gravou por cima enquanto o buffer estava sujo.
  disk.files.set("/notas/a.md", "versão de outro programa");
  return {
    documentId: "aba-1",
    name: "a.md",
    path: "/notas/a.md",
    content: buffer,
  };
}

describe("conflito externo — Recarregar", () => {
  it("relê o disco, adota a versão e deixa o buffer limpo sem escrever", async () => {
    const disk = createFakeDisk({ "/notas/a.md": "versão-base" });
    const document = conflictingDocument(disk);
    disk.reads.length = 0;

    const result = await resolveConflict("reload", document, disk.deps());

    assert.deepEqual(result, { kind: "reloaded", content: "versão de outro programa" });
    assert.deepEqual(disk.reads, ["/notas/a.md"], "relê o disco, e do caminho certo");
    const session = disk.sessions.forDocument("aba-1");
    assert.equal(session.isDirty, false);
    assert.equal(session.diskHash, fingerprintContent("versão de outro programa"));
    assert.deepEqual(disk.writes, [], "recarregar não grava nada");
    assert.equal(disk.files.get("/notas/a.md"), "versão de outro programa");
  });

  it("falha ao ler mantém o buffer e o conflito como estavam", async () => {
    const disk = createFakeDisk({ "/notas/a.md": "versão-base" });
    const document = conflictingDocument(disk);
    disk.failNextReads(1);

    const result = await resolveConflict("reload", document, disk.deps());

    assert.equal(result.kind, "failed");
    assert.match(result.kind === "failed" ? result.reason : "", /permission denied/);
    const session = disk.sessions.forDocument("aba-1");
    assert.equal(session.isDirty, true, "nada foi adotado: o buffer continua sujo");
    assert.equal(disk.writes.length, 0);
  });
});

describe("conflito externo — Salvar cópia", () => {
  it("grava em caminho novo e não toca no arquivo que conflitou", async () => {
    const disk = createFakeDisk({ "/notas/a.md": "versão-base" });
    const document = conflictingDocument(disk);

    const result = await resolveConflict(
      "save-copy",
      document,
      disk.deps({ copyPath: "/notas/a (minha cópia).md" })
    );

    assert.deepEqual(result, { kind: "copy-saved", path: "/notas/a (minha cópia).md" });
    assert.equal(disk.files.get("/notas/a (minha cópia).md"), "a minha versão");
    assert.equal(
      disk.files.get("/notas/a.md"),
      "versão de outro programa",
      "a versão do disco foi sobrescrita por uma cópia"
    );
    assert.deepEqual(disk.creations, ["/notas/a (minha cópia).md"]);
    assert.deepEqual(disk.writes, [], "cópia usa criação exclusiva, não substituição");

    const session = disk.sessions.forDocument("aba-1");
    assert.equal(session.path, "/notas/a (minha cópia).md");
    assert.equal(session.isDirty, false);
  });

  it("cópia nunca sobrescreve arquivo que já existe", async () => {
    const disk = createFakeDisk({
      "/notas/a.md": "versão-base",
      "/notas/ocupado.md": "trabalho de outra pessoa",
    });
    const document = conflictingDocument(disk);

    const result = await resolveConflict(
      "save-copy",
      document,
      disk.deps({ copyPath: "/notas/ocupado.md" })
    );

    assert.equal(result.kind, "failed");
    assert.match(result.kind === "failed" ? result.reason : "", /already exists/);
    assert.equal(
      disk.files.get("/notas/ocupado.md"),
      "trabalho de outra pessoa",
      "o destino ocupado foi modificado"
    );
    assert.deepEqual(disk.creations, []);
    const session = disk.sessions.forDocument("aba-1");
    assert.equal(session.path, "/notas/a.md", "a sessão continua no documento original");
    assert.equal(session.isDirty, true);
  });

  it("desistir do seletor de destino cancela sem gravar", async () => {
    const disk = createFakeDisk({ "/notas/a.md": "versão-base" });
    const document = conflictingDocument(disk);

    const result = await resolveConflict("save-copy", document, disk.deps({ copyPath: null }));

    assert.deepEqual(result, { kind: "cancelled" });
    assert.deepEqual(disk.creations, []);
    assert.deepEqual(disk.writes, []);
  });
});

describe("conflito externo — Cancelar", () => {
  it("não lê, não grava e não muda a sessão", async () => {
    const disk = createFakeDisk({ "/notas/a.md": "versão-base" });
    const document = conflictingDocument(disk);
    const before = disk.sessions.forDocument("aba-1");
    disk.reads.length = 0;

    const result = await resolveConflict("cancel", document, disk.deps({ copyPath: "/x.md" }));

    assert.deepEqual(result, { kind: "cancelled" });
    assert.deepEqual(disk.reads, []);
    assert.deepEqual(disk.writes, []);
    assert.deepEqual(disk.creations, []);
    assert.equal(before.path, "/notas/a.md");
    assert.equal(before.isDirty, true, "cancelar preserva o trabalho não salvo");
    assert.equal(disk.files.get("/notas/a.md"), "versão de outro programa");
  });
});

describe("conflito externo — Comparar", () => {
  it("lê a versão do disco sem adotar nem gravar", async () => {
    const disk = createFakeDisk({ "/notas/a.md": "versão-base" });
    const document = conflictingDocument(disk);
    const session = disk.sessions.forDocument("aba-1");
    const revisionBefore = session.revision;
    disk.reads.length = 0;

    const result = await loadDiskVersion(document.path, disk.deps());

    assert.deepEqual(result, { kind: "loaded", content: "versão de outro programa" });
    assert.deepEqual(disk.reads, ["/notas/a.md"]);
    assert.deepEqual(disk.writes, []);
    assert.equal(session.revision, revisionBefore, "comparar não mexe na revisão");
    assert.equal(session.isDirty, true);
  });

  it("devolve falha tipada quando o disco não pode ser lido", async () => {
    const disk = createFakeDisk({ "/notas/a.md": "versão-base" });
    disk.failNextReads(1);

    const result = await loadDiskVersion("/notas/a.md", disk.deps());

    assert.equal(result.kind, "failed");
  });
});
