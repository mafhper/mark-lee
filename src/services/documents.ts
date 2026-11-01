/**
 * Fachada de I/O documental do Editor.
 *
 * **Por que existe:** o app gravava documento em três lugares diferentes
 * (`App.tsx` — salvar, exportar e autosave) chamando `writeFile` direto. Cada
 * um tratava erro do seu jeito, nenhum sabia qual revisão do texto tinha ido
 * para o disco e dois podiam gravar o mesmo arquivo ao mesmo tempo. `ML-H03`
 * (`plano-hibi-ml-h01-h14.md`) pede um contrato único: revisão monotônica,
 * `savedRevision`, fingerprint de disco e resultado tipado.
 *
 * **Sem dependência de runtime:** a leitura e a escrita chegam por injeção
 * (`DocumentIo`). A ponte Tauri continua em `services/filesystem.ts`, e quem
 * monta as duas é o app. Isso é o que permite testar a sessão com um disco falso
 * em vez de simular `invoke`.
 *
 * **Contrato comum de persistência** (o desenho inteiro está em
 * `services/serialWrites.ts`): primitivo `atomic_write_text` → `safe_write`,
 * fila serial **por caminho** e resultado tipado nesta borda. O detector de
 * conflito do editor é o **fingerprint de conteúdo** — o do diário é `mtime`, e a
 * diferença é deliberada: os dois recusam sobrescrita silenciosa de uma versão
 * que o app não viu, por sinais que cada lado tem em mãos.
 */

/** Porta de I/O. `readText` rejeita quando o arquivo não existe ou não abre. */
export interface DocumentIo {
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
}

/**
 * Resultado de uma gravação. Não existe caminho de "salvou, mas…": ou o texto
 * está no disco (`saved`), ou o usuário desistiu do destino (`cancelled`), ou o
 * disco tem outra versão (`conflict`), ou falhou (`failed`).
 */
export type SaveOutcome =
  | { kind: "saved"; documentId: string; revision: number; diskHash: string }
  | { kind: "cancelled" }
  | { kind: "conflict"; diskHash: string; expectedHash: string }
  | { kind: "failed"; reason: string };

export interface SaveRequest {
  /** Destino escolhido pelo usuário. `null` significa que ele desistiu. */
  path: string | null;
  content: string;
}

export interface WriteRequest {
  documentId: string;
  path: string | null;
  content: string;
}

export interface DocumentSession {
  readonly documentId: string;
  /** Revisão monotônica do texto em memória. */
  readonly revision: number;
  /** Revisão que a sessão sabe estar no disco. */
  readonly savedRevision: number;
  /** Fingerprint do conteúdo que a sessão acredita estar no disco. */
  readonly diskHash: string | null;
  readonly path: string | null;
  readonly isDirty: boolean;
  readonly lastOutcome: SaveOutcome | null;
  /** Registra uma edição que mudou o texto. Devolve a revisão nova. */
  noteEdit(): number;
  /** Adota o que está no disco como referência de comparação. */
  trackDisk(path: string, content: string): void;
  /**
   * Adota a versão do disco como conteúdo do documento ("Recarregar" no
   * diálogo de conflito). A revisão **avança** — o texto em memória mudou — e já
   * nasce gravada: o buffer é exatamente o que está no disco.
   */
  adoptDiskContent(path: string, content: string): void;
  /**
   * Registra uma cópia que o usuário gravou em caminho novo ("Salvar cópia").
   * O buffer passa a ser o documento daquele arquivo, e o caminho original não
   * foi tocado.
   */
  trackSavedCopy(path: string, content: string): void;
  /**
   * Reabre a sessão a partir de um rascunho recuperado (`diskHash` é o
   * fingerprint que a sessão acreditava estar no disco quando o rascunho foi
   * escrito). Reconstrói a relação limpo/sujo sem fingir que houve gravação.
   */
  restoreDraft(path: string | null, content: string, diskHash: string | null): void;
  save(request: SaveRequest): Promise<SaveOutcome>;
}

/**
 * Fingerprint de conteúdo: FNV-1a de 32 bits em duas faixas independentes
 * (64 bits ao todo). **Não é digest criptográfico** — serve para detectar que o
 * arquivo mudou desde a última vez que a sessão o leu. Para isso, 64 bits dão
 * margem de sobra, e a função fica síncrona, sem depender de WebCrypto (que
 * exige contexto seguro, e nem toda webview de desktop é uma).
 */
export function fingerprintContent(content: string): string {
  let low = 0x811c9dc5;
  let high = 0x01000193;
  for (let index = 0; index < content.length; index += 1) {
    const code = content.charCodeAt(index);
    low = Math.imul(low ^ code, 0x01000193) >>> 0;
    high = Math.imul(high ^ code, 0x85ebca6b) >>> 0;
  }
  return `${low.toString(16).padStart(8, "0")}${high.toString(16).padStart(8, "0")}`;
}

/** Tauri rejeita `invoke` com `String`; o resto pode ser `Error`. */
export function describeFailure(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim().length > 0) return error;
  return "unknown_error";
}

class DocumentSessionImpl implements DocumentSession {
  private currentRevision = 0;
  private lastSavedRevision = 0;
  private currentPath: string | null = null;
  private currentDiskHash: string | null = null;
  private last: SaveOutcome | null = null;
  private queue: Promise<void> = Promise.resolve();
  private readonly identifier: string;
  private readonly io: DocumentIo;

  constructor(identifier: string, io: DocumentIo) {
    this.identifier = identifier;
    this.io = io;
  }

  get documentId(): string {
    return this.identifier;
  }

  get revision(): number {
    return this.currentRevision;
  }

  get savedRevision(): number {
    return this.lastSavedRevision;
  }

  get diskHash(): string | null {
    return this.currentDiskHash;
  }

  get path(): string | null {
    return this.currentPath;
  }

  get isDirty(): boolean {
    return this.currentRevision !== this.lastSavedRevision;
  }

  get lastOutcome(): SaveOutcome | null {
    return this.last;
  }

  noteEdit(): number {
    this.currentRevision += 1;
    return this.currentRevision;
  }

  trackDisk(path: string, content: string): void {
    this.currentPath = path;
    this.currentDiskHash = fingerprintContent(content);
  }

  adoptDiskContent(path: string, content: string): void {
    this.currentPath = path;
    this.currentDiskHash = fingerprintContent(content);
    // O texto em memória mudou para o do disco: a revisão avança (é monotônica)
    // e a revisão salva acompanha, porque não há nada a gravar.
    this.currentRevision += 1;
    this.lastSavedRevision = this.currentRevision;
  }

  trackSavedCopy(path: string, content: string): void {
    // O buffer já era este texto; só o disco é novo. Nenhuma revisão avança.
    this.currentPath = path;
    this.currentDiskHash = fingerprintContent(content);
    this.lastSavedRevision = this.currentRevision;
  }

  restoreDraft(path: string | null, content: string, diskHash: string | null): void {
    this.currentPath = path;
    this.currentDiskHash = diskHash;
    // A revisão não retrocede: reabrir a sessão a partir de um rascunho pode
    // acontecer depois de edições, e voltar para 1 faria um texto que ninguém
    // gravou aparecer como salvo (`savedRevision === revision`). O piso é 1
    // porque o buffer restaurado já é uma revisão do documento.
    const revision = Math.max(this.currentRevision, 1);
    this.currentRevision = revision;
    const matchesDisk = diskHash !== null && diskHash === fingerprintContent(content);
    // A revisão gravada também não sobe: só uma gravação faz isso. Com texto que
    // não é o do disco, ela fica abaixo da atual — e o documento, sujo.
    this.lastSavedRevision = matchesDisk
      ? revision
      : Math.min(this.lastSavedRevision, revision - 1);
  }

  async save(request: SaveRequest): Promise<SaveOutcome> {
    // A revisão é capturada **no pedido**, não na vez da fila: é a revisão do
    // texto que o chamador entregou. Capturar dentro da tarefa daria à primeira
    // gravação a revisão de uma edição que ainda não existia quando ela foi
    // pedida — um rótulo que não corresponde ao conteúdo.
    const capturedRevision = this.currentRevision;

    // Fila serial **por documento**: dois pedidos de save do mesmo texto nunca
    // correm juntos — o segundo espera o primeiro terminar e só então lê a
    // referência de disco que o primeiro deixou. Documentos diferentes não se
    // bloqueiam.
    const run = this.queue.then(() => this.performSave(request, capturedRevision));
    this.queue = run.then(
      () => undefined,
      () => undefined
    );

    // `save` **nunca** rejeita: o contrato é resultado tipado. Se algo escapar do
    // caminho previsto (um erro de programação, não de disco), ele vira `failed`
    // em vez de virar exceção solta no chamador.
    let outcome: SaveOutcome;
    try {
      outcome = await run;
    } catch (error) {
      outcome = { kind: "failed", reason: describeFailure(error) };
    }
    this.last = outcome;
    return outcome;
  }

  private async performSave(
    request: SaveRequest,
    capturedRevision: number
  ): Promise<SaveOutcome> {
    if (!request.path) return { kind: "cancelled" };

    // A referência só vale para o arquivo que a sessão conhece: `Salvar como`
    // aponta para outro caminho e sobrescrevê-lo é a escolha declarada do
    // usuário. Caminho conhecido **sem** referência (rascunho recuperado, por
    // exemplo) é outra coisa: a sessão sabe onde o documento vive e nunca leu o
    // que está lá.
    const knownPath = this.currentPath === request.path;
    const baseline = knownPath ? this.currentDiskHash : null;
    if (knownPath) {
      const onDisk = await this.readDiskHash(request.path);
      if (onDisk === null) {
        // A sessão conhecia uma versão neste caminho e agora não consegue ler
        // nenhuma. Pode ser remoção por fora ou permissão de leitura perdida;
        // nos dois casos gravar por cima recriaria um arquivo sem saber o que
        // havia nele. Recriar em silêncio é o que o P0.5 proíbe — quem decide é
        // o usuário, por `Salvar como` (que não usa esta referência). O selo
        // `deletedExternally` da aba é só o aviso do watcher; aqui quem decide é
        // a leitura, que é autoritativa e cobre também o caso em que o selo não
        // chegou (permissão perdida, watcher atrasado).
        return { kind: "failed", reason: "file_removed_on_disk" };
      }
      // Sem fingerprint não há o que comparar: o usuário pediu para salvar neste
      // caminho e o arquivo existe. O que não se admite é a criação silenciosa
      // acima, não a gravação pedida.
      if (baseline !== null && onDisk !== baseline) {
        return { kind: "conflict", diskHash: onDisk, expectedHash: baseline };
      }
    }

    try {
      await this.io.writeText(request.path, request.content);
    } catch (error) {
      return { kind: "failed", reason: describeFailure(error) };
    }

    const diskHash = fingerprintContent(request.content);
    this.currentPath = request.path;
    this.currentDiskHash = diskHash;
    // `max` porque a fila pode terminar uma gravação antiga depois de uma nova:
    // a revisão salva nunca anda para trás.
    this.lastSavedRevision = Math.max(this.lastSavedRevision, capturedRevision);

    return {
      kind: "saved",
      documentId: this.identifier,
      revision: capturedRevision,
      diskHash,
    };
  }

  private async readDiskHash(path: string): Promise<string | null> {
    try {
      return fingerprintContent(await this.io.readText(path));
    } catch {
      return null;
    }
  }
}

export interface DocumentSessions {
  forDocument(documentId: string): DocumentSession;
  peek(documentId: string): DocumentSession | undefined;
  save(request: SaveRequest & { documentId: string }): Promise<SaveOutcome>;
  /**
   * Gravação derivada (export, cópia): artefato novo, sem baseline de sessão e
   * sem detecção de conflito — o destino foi escolhido no diálogo e sobrescrevê-lo
   * é a intenção declarada. Devolve a revisão do documento de origem que foi
   * exportada.
   */
  writeDerived(request: WriteRequest): Promise<SaveOutcome>;
}

export function createDocumentSessions(io: DocumentIo): DocumentSessions {
  const sessions = new Map<string, DocumentSessionImpl>();

  const forDocument = (documentId: string): DocumentSession => {
    const existing = sessions.get(documentId);
    if (existing) return existing;
    const created = new DocumentSessionImpl(documentId, io);
    sessions.set(documentId, created);
    return created;
  };

  return {
    forDocument,
    peek: (documentId) => sessions.get(documentId),
    save: (request) => forDocument(request.documentId).save(request),
    async writeDerived(request) {
      if (!request.path) return { kind: "cancelled" };
      const revision = sessions.get(request.documentId)?.revision ?? 0;
      try {
        await io.writeText(request.path, request.content);
      } catch (error) {
        return { kind: "failed", reason: describeFailure(error) };
      }
      return {
        kind: "saved",
        documentId: request.documentId,
        revision,
        diskHash: fingerprintContent(request.content),
      };
    },
  };
}
