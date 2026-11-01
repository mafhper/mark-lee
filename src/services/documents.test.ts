import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDocumentSessions, fingerprintContent } from "./documents.ts";

/** Disco falso: o mapa é o "arquivo em disco" e o registro de chamadas é o que
 *  prova ordem e ausência de escrita. Nada aqui conhece a implementação da
 *  sessão — é o mesmo par leitura/escrita que o app injeta. */
function createFakeDisk(initial: Record<string, string> = {}) {
  const files = new Map(Object.entries(initial));
  const reads: string[] = [];
  const writes: { path: string; content: string }[] = [];
  let gate: Promise<void> | null = null;

  return {
    files,
    reads,
    writes,
    /** Segura a próxima escrita até `release()` — para edição durante o I/O. */
    holdWrites() {
      let release = () => {};
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => release();
    },
    io: {
      async readText(path: string) {
        reads.push(path);
        if (!files.has(path)) throw new Error(`not found: ${path}`);
        return files.get(path) as string;
      },
      async writeText(path: string, content: string) {
        writes.push({ path, content });
        if (gate) await gate;
        files.set(path, content);
      },
    },
  };
}

async function flush(times = 3) {
  for (let index = 0; index < times; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("fingerprintContent", () => {
  it("é determinístico para o mesmo conteúdo e diferente quando o texto muda", () => {
    assert.equal(fingerprintContent("conteúdo"), fingerprintContent("conteúdo"));
    assert.notEqual(fingerprintContent("conteúdo"), fingerprintContent("conteudo"));
    assert.notEqual(fingerprintContent(""), fingerprintContent(" "));
    assert.match(fingerprintContent(""), /^[0-9a-f]{16}$/);
  });
});

describe("DocumentSession — salvar", () => {
  it("devolve saved com a revisão que foi para o disco e o fingerprint gravado", async () => {
    const disk = createFakeDisk();
    const sessions = createDocumentSessions(disk.io);
    const session = sessions.forDocument("tab-1");

    session.noteEdit();
    session.noteEdit();
    const outcome = await session.save({ path: "/notas/a.md", content: "primeira versão" });

    assert.deepEqual(outcome, {
      kind: "saved",
      documentId: "tab-1",
      revision: 2,
      diskHash: fingerprintContent("primeira versão"),
    });
    assert.equal(disk.files.get("/notas/a.md"), "primeira versão");
    assert.equal(session.revision, 2);
    assert.equal(session.savedRevision, 2);
    assert.equal(session.isDirty, false);
    assert.equal(session.diskHash, fingerprintContent("primeira versão"));
    assert.equal(session.path, "/notas/a.md");
  });

  it("devolve cancelled sem escrever quando não há destino escolhido", async () => {
    const disk = createFakeDisk();
    const session = createDocumentSessions(disk.io).forDocument("tab-1");
    session.noteEdit();

    const outcome = await session.save({ path: null, content: "rascunho" });

    assert.deepEqual(outcome, { kind: "cancelled" });
    assert.equal(disk.writes.length, 0);
    assert.equal(session.isDirty, true);
    assert.equal(session.savedRevision, 0);
  });
});

describe("DocumentSession — falha", () => {
  it("devolve failed com o motivo, sem marcar a revisão como salva", async () => {
    const disk = createFakeDisk({ "/notas/a.md": "no disco" });
    const io = {
      readText: disk.io.readText,
      writeText: async () => {
        // Tauri rejeita `invoke` com String, não com Error.
        throw "destination is locked by another process: /notas/a.md";
      },
    };
    const session = createDocumentSessions(io).forDocument("tab-1");
    session.noteEdit();

    const outcome = await session.save({ path: "/notas/a.md", content: "nova" });

    assert.deepEqual(outcome, {
      kind: "failed",
      reason: "destination is locked by another process: /notas/a.md",
    });
    assert.equal(session.savedRevision, 0);
    assert.equal(session.isDirty, true);
    assert.equal(disk.files.get("/notas/a.md"), "no disco");
  });

  it("propaga a mensagem de um Error lançado pela escrita", async () => {
    const io = {
      readText: async () => "",
      writeText: async () => {
        throw new Error("permission denied: /notas/a.md");
      },
    };
    const session = createDocumentSessions(io).forDocument("tab-1");

    const outcome = await session.save({ path: "/notas/a.md", content: "x" });

    assert.deepEqual(outcome, { kind: "failed", reason: "permission denied: /notas/a.md" });
  });

  it("não escapa exceção de erro inesperado: também volta como failed", async () => {
    const disk = createFakeDisk();
    const session = createDocumentSessions(disk.io).forDocument("tab-1");
    // Conteúdo que estoura ao ser lido como texto: prova que o contrato é
    // "sempre um resultado tipado", não "só quando o disco falha".
    const exploding = new Proxy(
      {},
      {
        get() {
          throw new Error("conteúdo inválido");
        },
      }
    ) as unknown as string;

    const outcome = await session.save({ path: "/notas/a.md", content: exploding });

    assert.deepEqual(outcome, { kind: "failed", reason: "conteúdo inválido" });
    assert.equal(session.diskHash, null, "nada de disco foi adotado por uma gravação que falhou");
    assert.equal(session.lastOutcome?.kind, "failed");
  });
});

describe("DocumentSession — revisão durante o I/O", () => {
  it("não marca como limpo quando uma edição chega enquanto a gravação corre", async () => {
    const disk = createFakeDisk();
    const session = createDocumentSessions(disk.io).forDocument("tab-1");
    session.noteEdit();
    const release = disk.holdWrites();

    const pending = session.save({ path: "/notas/a.md", content: "texto do clique" });
    await flush();
    session.noteEdit();
    release();
    const outcome = await pending;

    assert.equal(outcome.kind, "saved");
    assert.equal(outcome.kind === "saved" ? outcome.revision : -1, 1);
    assert.equal(session.revision, 2);
    assert.equal(session.savedRevision, 1);
    assert.equal(session.isDirty, true);
  });
});

describe("DocumentSession — fila serial", () => {
  it("serializa dois saves do mesmo documento e o segundo compara contra o que o primeiro gravou", async () => {
    const disk = createFakeDisk();
    const sessions = createDocumentSessions(disk.io);
    const session = sessions.forDocument("tab-1");

    session.noteEdit();
    const release = disk.holdWrites();
    const first = session.save({ path: "/notas/a.md", content: "um" });
    session.noteEdit();
    const second = session.save({ path: "/notas/a.md", content: "dois" });

    await flush();
    assert.deepEqual(
      disk.writes.map((entry) => entry.content),
      ["um"],
      "a segunda gravação espera a primeira terminar"
    );
    release();

    const firstOutcome = await first;
    const secondOutcome = await second;

    assert.deepEqual(
      disk.writes.map((entry) => entry.content),
      ["um", "dois"],
      "a ordem das gravações é a ordem dos pedidos"
    );
    assert.equal(firstOutcome.kind === "saved" ? firstOutcome.revision : -1, 1);
    assert.equal(
      secondOutcome.kind,
      "saved",
      "o segundo pedido não pode acusar conflito contra a versão que ele mesmo acabou de gravar"
    );
    assert.equal(secondOutcome.kind === "saved" ? secondOutcome.revision : -1, 2);
    assert.equal(session.savedRevision, 2);
    assert.equal(session.isDirty, false);
    assert.equal(disk.files.get("/notas/a.md"), "dois");
  });

  it("não bloqueia documentos diferentes entre si", async () => {
    const disk = createFakeDisk();
    const sessions = createDocumentSessions(disk.io);
    const one = sessions.forDocument("tab-1");
    const two = sessions.forDocument("tab-2");

    one.noteEdit();
    two.noteEdit();
    const release = disk.holdWrites();
    const first = one.save({ path: "/notas/a.md", content: "a" });
    const second = two.save({ path: "/notas/b.md", content: "b" });

    await flush();
    assert.equal(disk.writes.length, 2, "documentos distintos não entram na mesma fila");

    release();
    await Promise.all([first, second]);
  });
});

describe("DocumentSession — conflito com o disco", () => {
  it("devolve conflict e não escreve quando o arquivo mudou por fora", async () => {
    const disk = createFakeDisk({ "/notas/a.md": "original" });
    const session = createDocumentSessions(disk.io).forDocument("tab-1");
    session.trackDisk("/notas/a.md", "original");
    disk.files.set("/notas/a.md", "editado por outro programa");
    session.noteEdit();

    const outcome = await session.save({ path: "/notas/a.md", content: "o meu texto" });

    assert.deepEqual(outcome, {
      kind: "conflict",
      diskHash: fingerprintContent("editado por outro programa"),
      expectedHash: fingerprintContent("original"),
    });
    assert.equal(disk.writes.length, 0, "a versão do disco não é sobrescrita sem decisão");
    assert.equal(disk.files.get("/notas/a.md"), "editado por outro programa");
    assert.equal(session.savedRevision, 0);
    assert.equal(session.isDirty, true);
  });

  it("não acusa conflito quando o disco ainda é o que a sessão gravou", async () => {
    const disk = createFakeDisk();
    const session = createDocumentSessions(disk.io).forDocument("tab-1");
    session.noteEdit();
    await session.save({ path: "/notas/a.md", content: "um" });
    session.noteEdit();

    const outcome = await session.save({ path: "/notas/a.md", content: "dois" });

    assert.equal(outcome.kind, "saved");
    assert.equal(session.isDirty, false);
  });

  it("arquivo removido por fora não é recriado em silêncio", async () => {
    const disk = createFakeDisk({ "/notas/a.md": "original" });
    const session = createDocumentSessions(disk.io).forDocument("tab-1");
    session.trackDisk("/notas/a.md", "original");
    session.noteEdit();
    disk.files.delete("/notas/a.md");

    const outcome = await session.save({ path: "/notas/a.md", content: "o meu texto" });

    assert.deepEqual(outcome, { kind: "failed", reason: "file_removed_on_disk" });
    assert.equal(disk.writes.length, 0, "a gravação recriou um arquivo que não existia mais");
    assert.equal(disk.files.has("/notas/a.md"), false);
    assert.equal(session.isDirty, true);
  });

  it("arquivo ausente com a sessão sem referência não é recriado em silêncio", async () => {
    // O caso que o teste acima não cobria: a sessão sabe **em que caminho** o
    // documento vive (é o que um rascunho recuperado traz) mas não tem
    // fingerprint de disco — o arquivo não pôde ser lido na abertura. Sem
    // referência, a gravação antiga escrevia por cima do nada e recriava o
    // arquivo que alguém tinha apagado; ausência de referência não é licença
    // para isso.
    const disk = createFakeDisk();
    const session = createDocumentSessions(disk.io).forDocument("aba-1");
    session.restoreDraft("/notas/a.md", "texto não salvo", null);

    const outcome = await session.save({ path: "/notas/a.md", content: "texto não salvo" });

    assert.deepEqual(outcome, { kind: "failed", reason: "file_removed_on_disk" });
    assert.equal(disk.writes.length, 0, "a gravação recriou um arquivo que não existia mais");
    assert.equal(disk.files.has("/notas/a.md"), false);
    assert.equal(session.isDirty, true, "o texto continua sem destino depois da recusa");
  });

  it("arquivo presente sem referência aceita a gravação pedida", async () => {
    // Ausência de fingerprint não bloqueia para sempre: o documento precisa
    // continuar salvável. O que se recusa é a **criação** silenciosa, provada
    // acima — não a gravação que o usuário pediu num caminho que existe.
    const disk = createFakeDisk({ "/notas/a.md": "criado por outro programa" });
    const session = createDocumentSessions(disk.io).forDocument("aba-1");
    session.restoreDraft("/notas/a.md", "texto não salvo", null);

    const outcome = await session.save({ path: "/notas/a.md", content: "texto não salvo" });

    assert.equal(outcome.kind, "saved");
    assert.equal(disk.files.get("/notas/a.md"), "texto não salvo");
    assert.equal(session.isDirty, false);
  });

  it("Salvar como não compara contra a referência do arquivo anterior", async () => {
    const disk = createFakeDisk({
      "/notas/a.md": "original",
      "/notas/b.md": "outro documento, outra história",
    });
    const session = createDocumentSessions(disk.io).forDocument("tab-1");
    session.trackDisk("/notas/a.md", "original");
    session.noteEdit();

    const outcome = await session.save({ path: "/notas/b.md", content: "texto novo" });

    assert.equal(outcome.kind, "saved");
    assert.equal(disk.files.get("/notas/b.md"), "texto novo");
    assert.equal(session.path, "/notas/b.md");
  });
});

describe("DocumentSession — decisões do conflito externo", () => {
  it("adotar o disco torna o buffer limpo sem gravar nada", async () => {
    const disk = createFakeDisk({ "/notas/a.md": "versão do disco" });
    const session = createDocumentSessions(disk.io).forDocument("tab-1");
    session.trackDisk("/notas/a.md", "versão antiga");
    session.noteEdit();
    session.noteEdit();
    assert.equal(session.isDirty, true);

    session.adoptDiskContent("/notas/a.md", "versão do disco");

    assert.equal(session.revision, 3, "a revisão avança: o texto em memória mudou");
    assert.equal(session.savedRevision, 3);
    assert.equal(session.isDirty, false);
    assert.equal(session.diskHash, fingerprintContent("versão do disco"));
    assert.equal(disk.writes.length, 0, "adotar o disco não escreve");
    assert.equal(disk.files.get("/notas/a.md"), "versão do disco");
  });

  it("registrar cópia aponta a sessão para o arquivo novo e mantém o buffer limpo", async () => {
    const disk = createFakeDisk({ "/notas/a.md": "versão do disco" });
    const session = createDocumentSessions(disk.io).forDocument("tab-1");
    session.trackDisk("/notas/a.md", "versão antiga");
    session.noteEdit();
    disk.files.set("/notas/copia.md", "a minha versão");

    session.trackSavedCopy("/notas/copia.md", "a minha versão");

    assert.equal(session.path, "/notas/copia.md");
    assert.equal(session.isDirty, false, "o arquivo novo tem exatamente o texto do buffer");
    assert.equal(session.diskHash, fingerprintContent("a minha versão"));
    assert.equal(disk.files.get("/notas/a.md"), "versão do disco", "o original não muda");
  });

  it("restaurar rascunho reconstrói a relação sujo/limpo pelo hash de disco", () => {
    const sessions = createDocumentSessions(createFakeDisk().io);

    const sujo = sessions.forDocument("aba-suja");
    sujo.restoreDraft("/notas/a.md", "texto não salvo", fingerprintContent("texto do disco"));
    assert.equal(sujo.isDirty, true);
    assert.equal(sujo.path, "/notas/a.md");

    const limpo = sessions.forDocument("aba-limpa");
    limpo.restoreDraft("/notas/a.md", "texto do disco", fingerprintContent("texto do disco"));
    assert.equal(limpo.isDirty, false);

    const semCaminho = sessions.forDocument("aba-sem-caminho");
    semCaminho.restoreDraft(null, "rascunho", null);
    assert.equal(semCaminho.isDirty, true);
    assert.equal(semCaminho.path, null);
  });

  it("restaurar rascunho não faz a revisão retroceder", () => {
    // Um rascunho recuperado pode chegar a uma sessão que já tem edições (a
    // sessão é por id de aba, e o id reaparece). Devolver a revisão a 1 faria
    // `savedRevision === revision` com texto que ninguém gravou: o documento
    // apareceria limpo e a guarda de fechamento não perguntaria nada.
    const sessions = createDocumentSessions(createFakeDisk().io);
    const session = sessions.forDocument("aba-1");
    session.noteEdit();
    session.noteEdit();
    session.noteEdit();

    session.restoreDraft("/notas/a.md", "texto do rascunho", fingerprintContent("texto do disco"));

    assert.equal(session.revision, 3, "a revisão voltou a 1 depois de três edições");
    assert.equal(session.isDirty, true);
  });

  it("restaurar rascunho não inventa revisão gravada", async () => {
    // A revisão salva não pode **subir** sem gravação: a única que houve foi a
    // da revisão 1, e é ela que continua valendo depois do rascunho.
    const disk = createFakeDisk();
    const session = createDocumentSessions(disk.io).forDocument("aba-1");
    session.noteEdit();
    await session.save({ path: "/notas/a.md", content: "gravado" });
    session.noteEdit();
    session.noteEdit();

    session.restoreDraft("/notas/a.md", "outro texto", fingerprintContent("gravado"));

    assert.equal(session.revision, 3);
    assert.equal(session.savedRevision, 1, "o rascunho declarou gravada uma revisão que nunca foi para o disco");
    assert.equal(session.isDirty, true);
  });
});

describe("DocumentSessions — gravação derivada (export)", () => {  it("grava sobre arquivo existente sem conflito e não mexe na sessão de origem", async () => {
    const disk = createFakeDisk({ "/saida/a.html": "versão anterior" });
    const sessions = createDocumentSessions(disk.io);
    const session = sessions.forDocument("tab-1");
    session.noteEdit();

    const outcome = await sessions.writeDerived({
      documentId: "tab-1",
      path: "/saida/a.html",
      content: "<!doctype html>",
    });

    assert.deepEqual(outcome, {
      kind: "saved",
      documentId: "tab-1",
      revision: 1,
      diskHash: fingerprintContent("<!doctype html>"),
    });
    assert.equal(disk.files.get("/saida/a.html"), "<!doctype html>");
    assert.equal(session.diskHash, null, "o artefato exportado não é o documento");
    assert.equal(session.path, null);
    assert.equal(session.isDirty, true);
  });

  it("devolve failed tipado quando a escrita do artefato falha", async () => {
    const io = {
      readText: async () => "",
      writeText: async () => {
        throw new Error("permission denied: /saida/a.html");
      },
    };
    const sessions = createDocumentSessions(io);

    const outcome = await sessions.writeDerived({
      documentId: "tab-1",
      path: "/saida/a.html",
      content: "x",
    });

    assert.deepEqual(outcome, { kind: "failed", reason: "permission denied: /saida/a.html" });
  });
});
