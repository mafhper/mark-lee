/**
 * Guardião de rascunhos (`ML-H05`): mantém o arquivo durável perto do buffer.
 *
 * **Por que existe fora do React:** o rascunho precisa ser escrito enquanto a
 * pessoa digita, sem que um render reinicie o relógio — o mesmo defeito que o
 * P0.4 descreve no autosave. Aqui o estado é **por documento**, o relógio é
 * injetado e nada conhece `window`, `invoke` ou React.
 *
 * **Relação com o autosave:** são coisas diferentes. O autosave grava o
 * documento **no caminho dele** e só existe quando há caminho; o rascunho cobre
 * justamente o que não tem destino (aba nova) e a edição que ainda não foi
 * salva. Se o documento está limpo, o rascunho é removido — ele deixou de ser a
 * única cópia.
 *
 * **Falha não some:** uma gravação que falha mantém a promessa pendente e é
 * tentada de novo no próximo silêncio ou no próximo `flush`. O erro nunca vira
 * "rascunho salvo".
 */

import type { DocumentDraft, DraftStore } from "./drafts.ts";

/** O que o guardião precisa saber de um documento **agora**. */
export interface DraftDocument {
  name: string;
  path: string | null;
  content: string;
  dirty: boolean;
  origin?: DocumentDraft["origin"];
  diskHash: string | null;
}

export interface DraftKeeperDeps {
  snapshot(documentId: string): DraftDocument | null;
  store: DraftStore;
  now?: () => number;
}

/** Relógio injetável: o teste passa um falso, o app usa o global. */
export interface DraftKeeperTimers {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface DraftKeeperOptions {
  /** Silêncio depois da última tecla antes de o rascunho ir para o disco. */
  debounceMs: number;
}

export const DRAFT_KEEPER_DEFAULTS: DraftKeeperOptions = {
  // O mesmo silêncio do autosave: um crash perde no máximo a última rajada de
  // teclas, e não o buffer inteiro.
  debounceMs: 2000,
};

export type DraftWriteOutcome = "written" | "skipped" | "failed";

export interface DocumentDraftKeeper {
  /** O buffer mudou: agenda (ou mantém) a escrita do rascunho deste documento. */
  note(documentId: string): void;
  /** O documento foi salvo ou descartado: esquece o timer e apaga o rascunho. */
  forget(documentId: string): Promise<void>;
  /** Escreve agora, inclusive para remover o rascunho de um documento limpo. */
  flush(documentId: string): Promise<DraftWriteOutcome>;
  /** Escreve o que está pendente (saída do app). Devolve quantos falharam. */
  flushAll(): Promise<{ failures: number }>;
  dispose(): void;
}

interface Entry {
  timer: unknown;
  /** Há edição que ainda não foi para o disco. */
  pending: boolean;
  /** Gravação em curso, para pedidos que chegam durante o I/O esperarem por ela. */
  running: Promise<DraftWriteOutcome> | null;
  /**
   * O documento foi salvo ou descartado enquanto a gravação corria. A gravação
   * em voo não pode escrever depois disto, e a falha dela não pode rearmar
   * retentativa: o rascunho deixou de existir por decisão do usuário.
   */
  forgotten: boolean;
}

const globalTimers: DraftKeeperTimers = {
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as number),
};

class DocumentDraftKeeperImpl implements DocumentDraftKeeper {
  private readonly deps: DraftKeeperDeps;
  private readonly timers: DraftKeeperTimers;
  private readonly options: DraftKeeperOptions;
  private readonly entries = new Map<string, Entry>();
  private disposed = false;

  constructor(
    deps: DraftKeeperDeps,
    options: Partial<DraftKeeperOptions> = {},
    timers: DraftKeeperTimers = globalTimers
  ) {
    this.deps = deps;
    this.timers = timers;
    this.options = { ...DRAFT_KEEPER_DEFAULTS, ...options };
  }

  note(documentId: string): void {
    if (this.disposed) return;
    const entry = this.entryFor(documentId);
    entry.pending = true;
    // Um timer por documento, armado na primeira tecla da rajada: digitação
    // contínua **não** adia o rascunho para sempre.
    if (entry.timer === null && !entry.running) this.arm(documentId, entry);
  }

  async forget(documentId: string): Promise<void> {
    const entry = this.entries.get(documentId);
    if (entry) {
      this.clearTimer(entry);
      // Marca antes de esperar: a gravação em voo já passou do ponto de decisão
      // ou ainda vai passar, e nenhuma das duas pode escrever por cima da
      // remoção que vem depois.
      entry.forgotten = true;
      entry.pending = false;
      this.entries.delete(documentId);
    }
    // Esperar a gravação em voo é o que impede a ressurreição: ela pode estar
    // exatamente entre o `store.write` e o retorno, e sem esta espera o
    // `remove` aconteceria **antes** da escrita — o arquivo voltaria a existir
    // e a próxima abertura ofereceria de volta o texto que o usuário descartou.
    if (entry?.running) {
      try {
        await entry.running;
      } catch {
        // A gravação em voo falhou: não há o que remover, mas o `remove` abaixo
        // continua valendo para o rascunho que já estava no disco.
      }
    }
    try {
      await this.deps.store.remove(documentId);
    } catch {
      // O rascunho sobra no disco. É a direção segura do erro: na próxima
      // abertura a pessoa é **oferecida** a recuperar, em vez de perder texto.
    }
  }

  flush(documentId: string): Promise<DraftWriteOutcome> {
    const entry = this.entries.get(documentId);
    if (!entry) return Promise.resolve("skipped");
    this.clearTimer(entry);
    return this.flushOne(documentId);
  }

  async flushAll(): Promise<{ failures: number }> {
    // Primeiro espera o que já está em curso: a edição que chegou durante o I/O
    // marcou `pending`, e ela só aparece depois que a gravação em voo termina.
    const running: Promise<DraftWriteOutcome>[] = [];
    for (const entry of this.entries.values()) {
      if (entry.running) running.push(entry.running);
    }
    if (running.length > 0) await Promise.all(running);

    const ids: string[] = [];
    for (const [documentId, entry] of this.entries) {
      if (entry.pending || entry.timer !== null) ids.push(documentId);
    }
    const outcomes = await Promise.all(ids.map((documentId) => this.flush(documentId)));
    return { failures: outcomes.filter((outcome) => outcome === "failed").length };
  }

  dispose(): void {
    this.disposed = true;
    for (const entry of this.entries.values()) this.clearTimer(entry);
    this.entries.clear();
  }

  private flushOne(documentId: string): Promise<DraftWriteOutcome> {
    if (this.disposed) return Promise.resolve("skipped");
    const entry = this.entries.get(documentId);
    if (!entry) return Promise.resolve("skipped");

    if (entry.running) {
      // Já há uma gravação deste documento no disco. Esperar por ela e tentar de
      // novo é o que garante que a edição que chegou durante o I/O também vire
      // rascunho — e é o caminho da saída do app, onde não existe "próximo
      // silêncio" para tentar depois.
      entry.pending = true;
      return entry.running.then(() => this.flushOne(documentId));
    }

    this.clearTimer(entry);
    entry.pending = false;
    const running = this.performWrite(documentId, entry);
    entry.running = running;
    return running;
  }

  private async performWrite(documentId: string, entry: Entry): Promise<DraftWriteOutcome> {
    try {
      if (entry.forgotten) return "skipped";
      const snapshot = this.deps.snapshot(documentId);
      if (!snapshot) {
        // O documento saiu da memória sem passar por `forget` (troca de workspace,
        // por exemplo). O rascunho existente fica: é recuperação, não lixo.
        entry.pending = false;
        this.entries.delete(documentId);
        return "skipped";
      }
      if (!snapshot.dirty) {
        await this.deps.store.remove(documentId);
        return "skipped";
      }
      // Segunda checagem, depois do último ponto em que se pode desistir sem
      // efeito: `forget` pode ter marcado a entrada enquanto o snapshot era
      // montado.
      if (entry.forgotten) return "skipped";
      await this.deps.store.write({
        documentId,
        name: snapshot.name,
        path: snapshot.path,
        content: snapshot.content,
        diskHash: snapshot.diskHash,
        dirty: true,
        origin: snapshot.origin,
        savedAt: this.deps.now ? this.deps.now() : Date.now(),
      });
      return "written";
    } catch {
      // Falha de documento esquecido não vira promessa: não há aba para tentar
      // de novo, e um retry recriaria o rascunho que `forget` apagou.
      if (entry.forgotten) return "skipped";
      entry.pending = true;
      return "failed";
    } finally {
      entry.running = null;
      if (!this.disposed && !entry.forgotten && entry.pending && entry.timer === null) {
        this.arm(documentId, entry);
      }
    }
  }

  private entryFor(documentId: string): Entry {
    const existing = this.entries.get(documentId);
    if (existing) return existing;
    const created: Entry = { timer: null, pending: false, running: null, forgotten: false };
    this.entries.set(documentId, created);
    return created;
  }

  private arm(documentId: string, entry: Entry): void {
    if (entry.timer !== null) return;
    entry.timer = this.timers.setTimeout(() => {
      entry.timer = null;
      void this.flushOne(documentId);
    }, this.options.debounceMs);
  }

  private clearTimer(entry: Entry): void {
    if (entry.timer === null) return;
    this.timers.clearTimeout(entry.timer);
    entry.timer = null;
  }
}

export function createDraftKeeper(
  deps: DraftKeeperDeps,
  options: Partial<DraftKeeperOptions> = {},
  timers: DraftKeeperTimers = globalTimers
): DocumentDraftKeeper {
  return new DocumentDraftKeeperImpl(deps, options, timers);
}
