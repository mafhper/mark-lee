/**
 * Autosave por documento, fora do React (`ML-H05`, fecha **P0.4**).
 *
 * **Por que existe:** o autosave era um `setInterval` dentro de um `useEffect`
 * que dependia de `tabs` e `activeTab` — o mesmo efeito que reiniciava o
 * cronômetro a cada render, ou seja, a cada tecla. Digitação contínua adiava o
 * salvamento indefinidamente, e a conclusão assíncrona marcava a aba limpa sem
 * comparar a revisão gravada com a revisão de agora: uma edição que chegasse
 * durante o I/O virava "salvo" e se perdia no próximo fechamento.
 *
 * **O que este módulo garante:**
 *
 * - o estado do agendador é de **um documento**, não do render. `note()` só
 *   reinicia o debounce daquele documento; o resto da árvore não participa;
 * - a revisão e o texto são capturados **no início** da gravação, e o documento
 *   só é marcado limpo quando `savedRevision === revision` **e** o texto enviado
 *   ainda é o texto de agora;
 * - uma gravação por documento: um pedido que chega durante o I/O não abre uma
 *   segunda escrita, ele arma a rodada seguinte;
 * - falha é estado explícito (`failed`, com motivo e número de tentativas) e
 *   tem repetição — automática e limitada, ou sob demanda por `flush`.
 *
 * **Sem React, sem `window`, sem `invoke`:** texto, sessão e publicação entram
 * por injeção, e os timers também. É o que deixa o agendamento testável com um
 * relógio falso em vez de esperar segundos reais.
 */

import {
  fingerprintContent,
  type SaveOutcome,
  type SaveRequest,
} from "../../services/documents.ts";

/** Fase publicada para a interface. */
export type AutosavePhase = "idle" | "pending" | "saving" | "saved" | "failed" | "conflict";

export interface AutosaveState {
  documentId: string;
  phase: AutosavePhase;
  /** Falhas seguidas desde a última gravação boa ou a última edição. */
  attempts: number;
  /** Motivo da última falha — é o que a barra de estado mostra. */
  reason: string | null;
}

/** O que o agendador precisa saber de um documento **agora**. */
export interface AutosaveDocument {
  /** `null` = nunca salvo. Autosave não inventa destino. */
  path: string | null;
  content: string;
}

/** O subconjunto de `DocumentSession` (ML-H03) que o agendador usa. */
export interface AutosaveSession {
  readonly revision: number;
  readonly savedRevision: number;
  readonly isDirty: boolean;
  save(request: SaveRequest): Promise<SaveOutcome>;
}

export interface AutosaveDeps {
  /** Texto e caminho atuais, lidos **na hora** da gravação, não no agendamento. */
  snapshot(documentId: string): AutosaveDocument | null;
  session(documentId: string): AutosaveSession;
  publish(state: AutosaveState): void;
}

/** Relógio injetável. Os testes passam um falso; o app usa o global. */
export interface AutosaveTimers {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  setInterval(callback: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
}

export interface AutosaveOptions {
  enabled: boolean;
  /** Silêncio depois da última tecla. Cada tecla reinicia **só** este relógio. */
  debounceMs: number;
  /** Rede de segurança para digitação contínua: salva no máximo a cada N ms. */
  intervalMs: number;
  /** Espera antes de repetir uma gravação que falhou. */
  retryDelayMs: number;
  /** Repetições automáticas depois da primeira falha. */
  maxRetries: number;
}

export const AUTOSAVE_DEFAULTS: AutosaveOptions = {
  enabled: true,
  // 2 s de silêncio é autosave "de verdade" sem escrever a cada tecla; o
  // intervalo (padrão do produto: 60 s) cobre quem não para de digitar.
  debounceMs: 2000,
  intervalMs: 60_000,
  retryDelayMs: 5000,
  maxRetries: 2,
};

export type AutosaveOutcome = "saved" | "skipped" | "failed" | "conflict";

export interface DocumentAutosaveScheduler {
  /** O texto do documento mudou (uma tecla). Reinicia o debounce dele. */
  note(documentId: string): void;
  /** O documento saiu da memória (aba fechada): esquece timers e estado. */
  forget(documentId: string): void;
  updateOptions(patch: Partial<AutosaveOptions>): void;
  /** Grava agora — é o gatilho explícito de repetição. */
  flush(documentId: string): Promise<AutosaveOutcome>;
  /** Grava o que está prometido (debounce armado ou falha pendente). */
  flushAll(): Promise<{ failures: number }>;
  state(documentId: string): AutosaveState;
  dispose(): void;
}

interface Entry {
  state: AutosaveState;
  debounce: unknown;
  retry: unknown;
  /** Uma gravação está em curso: o documento tem no máximo uma por vez. */
  inFlight: boolean;
}

const globalTimers: AutosaveTimers = {
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as number),
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
  clearInterval: (handle) => globalThis.clearInterval(handle as number),
};

class DocumentAutosaveSchedulerImpl implements DocumentAutosaveScheduler {
  private readonly deps: AutosaveDeps;
  private readonly timers: AutosaveTimers;
  private readonly entries = new Map<string, Entry>();
  private options: AutosaveOptions;
  private interval: unknown = null;
  private disposed = false;

  constructor(
    deps: AutosaveDeps,
    options: Partial<AutosaveOptions> = {},
    timers: AutosaveTimers = globalTimers
  ) {
    this.deps = deps;
    this.timers = timers;
    this.options = { ...AUTOSAVE_DEFAULTS, ...options };
    if (this.options.enabled) this.startInterval();
  }

  note(documentId: string): void {
    // Desligado é desligado: nenhum timer, nenhuma publicação. O `dirty` da aba
    // continua sendo do app, que não precisa deste módulo para nada.
    if (this.disposed || !this.options.enabled) return;

    const entry = this.entryFor(documentId);
    entry.state = { documentId, phase: "pending", attempts: 0, reason: null };
    this.clearTimer(entry, "debounce");
    this.clearTimer(entry, "retry");
    this.armDebounce(documentId, entry, this.options.debounceMs);
    this.publish(entry);
  }

  forget(documentId: string): void {
    const entry = this.entries.get(documentId);
    if (!entry) return;
    this.clearTimer(entry, "debounce");
    this.clearTimer(entry, "retry");
    this.entries.delete(documentId);
  }

  updateOptions(patch: Partial<AutosaveOptions>): void {
    const previous = this.options;
    this.options = { ...this.options, ...patch };

    if (!this.options.enabled) {
      // Desligar o autosave retira a promessa: nenhum timer pendente pode
      // escrever depois que o usuário pediu para não escrever.
      for (const entry of this.entries.values()) {
        this.clearTimer(entry, "debounce");
        this.clearTimer(entry, "retry");
      }
      this.stopInterval();
      return;
    }

    if (!previous.enabled || previous.intervalMs !== this.options.intervalMs) {
      this.startInterval();
    }
  }

  async flush(documentId: string): Promise<AutosaveOutcome> {
    const entry = this.entries.get(documentId);
    if (!entry) return "skipped";
    this.clearTimer(entry, "debounce");
    this.clearTimer(entry, "retry");
    return this.flushOne(documentId);
  }

  async flushAll(): Promise<{ failures: number }> {
    const ids = [...this.entries.values()]
      .filter(
        (entry) =>
          entry.debounce !== null ||
          entry.state.phase === "pending" ||
          entry.state.phase === "failed"
      )
      .map((entry) => entry.state.documentId);

    const outcomes = await Promise.all(ids.map((id) => this.flush(id)));
    return { failures: outcomes.filter((outcome) => outcome === "failed").length };
  }

  state(documentId: string): AutosaveState {
    return this.entries.get(documentId)?.state ?? idleState(documentId);
  }

  dispose(): void {
    this.disposed = true;
    for (const entry of this.entries.values()) {
      this.clearTimer(entry, "debounce");
      this.clearTimer(entry, "retry");
    }
    this.entries.clear();
    this.stopInterval();
  }

  private async flushOne(documentId: string): Promise<AutosaveOutcome> {
    const entry = this.entries.get(documentId);
    if (!entry) return "skipped";
    // Serialização por documento: o pedido que chega durante o I/O não abre uma
    // segunda escrita — a edição já deixou o documento pendente, e o fim desta
    // gravação arma a próxima rodada.
    if (entry.inFlight) return "skipped";

    const snapshot = this.deps.snapshot(documentId);
    if (!snapshot) {
      this.forget(documentId);
      return "skipped";
    }
    if (!snapshot.path) {
      // Documento sem destino: quem decide é o usuário, na guarda de
      // fechamento. Autosave não abre diálogo por trás da tela.
      entry.state = { ...entry.state, phase: "pending", reason: null };
      this.publish(entry);
      return "skipped";
    }

    const session = this.deps.session(documentId);
    // Capturados **no início**, como o P0.4 pede: revisão, texto e a revisão que
    // a sessão conhece como gravada.
    const capturedRevision = session.revision;
    const capturedHash = fingerprintContent(snapshot.content);
    const request: SaveRequest = { path: snapshot.path, content: snapshot.content };

    entry.inFlight = true;
    entry.state = {
      documentId,
      phase: "saving",
      attempts: entry.state.attempts,
      reason: null,
    };
    this.publish(entry);

    let outcome: SaveOutcome;
    try {
      outcome = await session.save(request);
    } catch (error) {
      outcome = {
        kind: "failed",
        reason: error instanceof Error && error.message ? error.message : "unknown_error",
      };
    }
    entry.inFlight = false;
    if (this.disposed) return "skipped";

    if (outcome.kind === "failed") {
      const attempts = entry.state.attempts + 1;
      entry.state = { documentId, phase: "failed", attempts, reason: outcome.reason };
      this.publish(entry);
      if (this.options.enabled && attempts <= this.options.maxRetries) {
        this.armRetry(documentId, entry, this.options.retryDelayMs * attempts);
      }
      return "failed";
    }

    if (outcome.kind === "conflict") {
      // Conflito não é falha de disco: repetir só reproduziria o mesmo conflito.
      // Fica visível até uma decisão do usuário (o diálogo é do próximo lote).
      entry.state = { documentId, phase: "conflict", attempts: 0, reason: "conflict" };
      this.publish(entry);
      return "conflict";
    }

    if (outcome.kind === "cancelled") {
      entry.state = { documentId, phase: "pending", attempts: entry.state.attempts, reason: null };
      this.publish(entry);
      return "skipped";
    }

    // `saved`: o disco tem o texto enviado. Limpo **só** se esse texto ainda for
    // o texto de agora e a revisão gravada for a revisão atual — é exatamente a
    // comparação que o autosave antigo não fazia.
    const current = this.deps.snapshot(documentId);
    const unchanged =
      current !== null &&
      current.path === request.path &&
      fingerprintContent(current.content) === capturedHash;
    const settled =
      unchanged &&
      session.savedRevision === session.revision &&
      session.revision === capturedRevision;

    if (settled) {
      entry.state = { documentId, phase: "saved", attempts: 0, reason: null };
      this.publish(entry);
      return "saved";
    }

    entry.state = { documentId, phase: "pending", attempts: 0, reason: null };
    this.publish(entry);
    // A edição que chegou durante o I/O precisa de uma rodada própria. Se já há
    // um debounce armado por ela, ele continua valendo (armar de novo não
    // atrasa nem antecipa nada além do silêncio que falta).
    if (this.options.enabled && session.isDirty) {
      this.armDebounce(documentId, entry, this.options.debounceMs);
    }
    return "saved";
  }

  private tick(): void {
    if (this.disposed || !this.options.enabled) return;
    for (const entry of this.entries.values()) {
      if (entry.inFlight) continue;
      const documentId = entry.state.documentId;
      const snapshot = this.deps.snapshot(documentId);
      if (!snapshot?.path) continue;
      if (!this.deps.session(documentId).isDirty) continue;
      void this.flushOne(documentId);
    }
  }

  private entryFor(documentId: string): Entry {
    const existing = this.entries.get(documentId);
    if (existing) return existing;
    const created: Entry = { state: idleState(documentId), debounce: null, retry: null, inFlight: false };
    this.entries.set(documentId, created);
    return created;
  }

  private armDebounce(documentId: string, entry: Entry, delayMs: number): void {
    if (entry.debounce !== null) return;
    entry.debounce = this.timers.setTimeout(() => {
      entry.debounce = null;
      void this.flushOne(documentId);
    }, delayMs);
  }

  private armRetry(documentId: string, entry: Entry, delayMs: number): void {
    this.clearTimer(entry, "retry");
    entry.retry = this.timers.setTimeout(() => {
      entry.retry = null;
      void this.flushOne(documentId);
    }, delayMs);
  }

  private clearTimer(entry: Entry, which: "debounce" | "retry"): void {
    const handle = entry[which];
    if (handle === null) return;
    this.timers.clearTimeout(handle);
    entry[which] = null;
  }

  private startInterval(): void {
    this.stopInterval();
    if (!this.options.enabled) return;
    this.interval = this.timers.setInterval(() => this.tick(), this.options.intervalMs);
  }

  private stopInterval(): void {
    if (this.interval === null) return;
    this.timers.clearInterval(this.interval);
    this.interval = null;
  }

  private publish(entry: Entry): void {
    this.deps.publish({ ...entry.state });
  }
}

function idleState(documentId: string): AutosaveState {
  return { documentId, phase: "idle", attempts: 0, reason: null };
}

export function createDocumentAutosaveScheduler(
  deps: AutosaveDeps,
  options: Partial<AutosaveOptions> = {},
  timers: AutosaveTimers = globalTimers
): DocumentAutosaveScheduler {
  return new DocumentAutosaveSchedulerImpl(deps, options, timers);
}
