import { isTauriRuntime } from "./runtime.ts";

/**
 * Updater do Tauri — checagem e download, **sem instalar** (`ML-H06`, fatia 1).
 *
 * **Por que existe:** o app não tinha updater nenhum: quem já instalou o
 * Mark-Lee dependia de baixar o instalador à mão. O plano ML-H06 pede a
 * máquina de estados completa e a instalação atrás de consentimento; esta
 * fatia entrega `idle → checking → available → downloading → ready`
 * (mais `cancelled`, `offline`, `unsupported-platform` e `error`) e **para**
 * aí. `install()` não é chamado em produção — ele entra na fatia seguinte,
 * depois do `LifecycleCoordinator.prepareForRestart()`.
 *
 * **O que este módulo não sabe:** React, DOM e a forma da tela. Ele expõe um
 * estado observável e três verbos (`check`, `download`, `cancel`). Quem fala
 * com o plugin é o `UpdaterClient` injetado — e é por essa porta que os testes
 * provam as regras sem tocar em Tauri.
 *
 * **As três regras que sustentam o desenho:**
 *
 * 1. **Baixar exige consentimento.** `download()` só age no estado `available`.
 *    Não existe caminho de download automático: o boot faz *uma* checagem de
 *    metadados, e o binário só desce quando a pessoa pede.
 * 2. **Uma checagem de boot por sessão.** A trava mora no serviço, e não no
 *    efeito do React: duplo mount (StrictMode) agenda duas vezes e cabe ao
 *    serviço recusar a segunda — uma requisição por sessão, não duas.
 * 3. **Cancelar é definitivo para aquela checagem.** O resultado tardio é
 *    descartado por geração, senão a tela oferece baixar o que a pessoa
 *    acabou de dispensar.
 */

/** Canal do feed. O Core publica `latest.json` no stable e `latest-beta.json` no
 *  beta; esta fatia só consome o stable — ver `.github/release.config.json`. */
export const UPDATER_CHANNEL = "stable";

/** Teto da checagem. Um feed que não responde não pode pendurar a tela. */
export const CHECK_TIMEOUT_MS = 12_000;

/** Teto do download. É generoso de propósito: o binário passa de 10 MB e a
 *  conexão pode ser lenta — mas um download travado não fica pendurado para
 *  sempre. */
export const DOWNLOAD_TIMEOUT_MS = 5 * 60_000;

/** Quando a checagem de boot começa. Deferida para não competir com o primeiro
 *  quadro do editor e com a leitura dos arquivos da sessão. */
export const BOOT_CHECK_DELAY_MS = 8_000;

/** Intervalo mínimo entre dois avisos de progresso. O plugin emite um evento
 *  por chunk, e um `setState` por chunk renderia a tela centenas de vezes. */
const PROGRESS_NOTIFY_MS = 120;

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "cancelled"
  | "offline"
  | "unsupported-platform"
  | "error";

export type UpdaterErrorCode = "check-failed" | "download-failed";

export interface UpdaterState {
  status: UpdaterStatus;
  /** Versão instalada, como o feed a reportou. `null` antes da primeira checagem. */
  currentVersion: string | null;
  /** Versão anunciada pelo feed. `null` fora de `available`/`downloading`/`ready`. */
  version: string | null;
  notes: string | null;
  /** Instante (ms) da última checagem concluída, com ou sem atualização. */
  checkedAt: number | null;
  receivedBytes: number;
  totalBytes: number | null;
  error: { code: UpdaterErrorCode; message: string } | null;
}

/** O que o feed anunciou e o que o cliente precisa guardar para baixar. */
export interface CheckedUpdate {
  version: string;
  currentVersion: string;
  notes?: string;
  date?: string;
}

export interface UpdaterClient {
  check(options: { timeout: number }): Promise<CheckedUpdate | null>;
  download(
    update: CheckedUpdate,
    onProgress: (progress: { receivedBytes: number; totalBytes: number | null }) => void,
    options: { timeout: number }
  ): Promise<void>;
  /** Solta o recurso do plugin quando a atualização é dispensada sem instalar. */
  close(update: CheckedUpdate): Promise<void>;
}

export interface UpdaterServiceOptions {
  client?: UpdaterClient;
  /** Fora do WebView do Tauri não há plugin: a tela mostra o motivo em vez de falhar. */
  supported?: () => boolean;
  online?: () => boolean;
  now?: () => number;
  /** Agendador injetável: os testes controlam quando a checagem de boot dispara. */
  schedule?: (task: () => void, delayMs: number) => () => void;
}

export interface UpdaterService {
  getState(): UpdaterState;
  subscribe(listener: (state: UpdaterState) => void): () => void;
  /** Uma checagem de metadados. Manual (Ajustes/paleta) e de boot usam a mesma
   *  porta — quem diferencia as duas é o agendamento, não o estado. */
  check(): Promise<void>;
  /** Só tem efeito no estado `available`: é o consentimento explícito. */
  download(): Promise<void>;
  cancel(): void;
  /** Devolve o cancelamento do agendamento, para o efeito do React limpar. */
  scheduleBootCheck(delayMs?: number): () => void;
}

function initialState(): UpdaterState {
  return {
    status: "idle",
    currentVersion: null,
    version: null,
    notes: null,
    checkedAt: null,
    receivedBytes: 0,
    totalBytes: null,
    error: null,
  };
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "erro desconhecido";
}

/** Falha de transporte — DNS, conexão recusada, timeout, host inalcançável.
 *  O plugin devolve isso como string do reqwest, então a classificação é por
 *  forma da mensagem, e o padrão é o lado seguro: sem casar, é `error`. */
function isTransportFailure(message: string): boolean {
  return /network|offline|dns|enotfound|econn|etimedout|timed?\s?out|failed to fetch|connection/i.test(message);
}

function defaultSchedule(task: () => void, delayMs: number): () => void {
  const id = setTimeout(task, delayMs);
  return () => clearTimeout(id);
}

/** Cliente real: fala com `tauri-plugin-updater` por `import()` dinâmico, para
 *  que o bundle web não carregue o plugin sem precisar e o teste em Node nunca
 *  o toque. O handle do plugin fica num `WeakMap` — o estado do app guarda só
 *  dados serializáveis, e o recurso do backend não vaza para a tela. */
function createTauriClient(): UpdaterClient {
  const handles = new WeakMap<CheckedUpdate, import("@tauri-apps/plugin-updater").Update>();

  return {
    async check({ timeout }) {
      const { check } = await import("@tauri-apps/plugin-updater");
      const found = await check({ timeout });
      if (!found) return null;
      const checked: CheckedUpdate = {
        version: found.version,
        currentVersion: found.currentVersion,
        notes: found.body,
        date: found.date,
      };
      handles.set(checked, found);
      return checked;
    },
    async download(update, onProgress, { timeout }) {
      const handle = handles.get(update);
      if (!handle) {
        throw new Error("Atualização sem handle: faça a checagem antes de baixar.");
      }
      let receivedBytes = 0;
      let totalBytes: number | null = null;
      await handle.download(
        (event) => {
          if (event.event === "Started") {
            totalBytes = event.data.contentLength ?? null;
          } else if (event.event === "Progress") {
            receivedBytes += event.data.chunkLength;
          }
          onProgress({ receivedBytes, totalBytes });
        },
        { timeout }
      );
    },
    async close(update) {
      const handle = handles.get(update);
      if (!handle) return;
      handles.delete(update);
      await handle.close();
    },
  };
}

export function createUpdaterService(options: UpdaterServiceOptions = {}): UpdaterService {
  const client = options.client ?? createTauriClient();
  const supported = options.supported ?? (() => isTauriRuntime());
  const online = options.online ?? (() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const now = options.now ?? (() => Date.now());
  const schedule = options.schedule ?? defaultSchedule;

  const listeners = new Set<(state: UpdaterState) => void>();
  let current = initialState();
  let announced: CheckedUpdate | null = null;
  let inFlight: Promise<void> | null = null;
  let downloadInFlight: Promise<void> | null = null;
  /** Geração da checagem: cancelar incrementa, e a resposta velha é descartada. */
  let generation = 0;
  let bootCheckSettled = false;
  let cancelScheduled: (() => void) | null = null;

  function emit(patch: Partial<UpdaterState>): void {
    current = { ...current, ...patch };
    for (const listener of listeners) listener(current);
  }

  function releaseAnnounced(): void {
    if (!announced) return;
    const stale = announced;
    announced = null;
    void client.close(stale).catch(() => {
      /* Soltar o handle é limpeza: se falhar, não há estado a corrigir. */
    });
  }

  async function check(): Promise<void> {
    if (inFlight) return inFlight;
    if (current.status === "downloading" || current.status === "ready") return;

    bootCheckSettled = true;
    if (cancelScheduled) {
      cancelScheduled();
      cancelScheduled = null;
    }

    if (!supported()) {
      emit({ ...initialState(), status: "unsupported-platform", checkedAt: now() });
      return;
    }
    if (!online()) {
      emit({ status: "offline", checkedAt: now(), error: null });
      return;
    }

    releaseAnnounced();
    const request = ++generation;
    emit({
      status: "checking",
      version: null,
      notes: null,
      receivedBytes: 0,
      totalBytes: null,
      error: null,
    });

    inFlight = (async () => {
      try {
        const found = await client.check({ timeout: CHECK_TIMEOUT_MS });
        if (request !== generation) return;
        if (!found) {
          emit({ status: "idle", checkedAt: now() });
          return;
        }
        announced = found;
        emit({
          status: "available",
          version: found.version,
          currentVersion: found.currentVersion,
          notes: found.notes ?? null,
          checkedAt: now(),
        });
      } catch (error) {
        if (request !== generation) return;
        const message = messageOf(error);
        if (isTransportFailure(message)) {
          emit({ status: "offline", checkedAt: now(), error: null });
        } else {
          emit({ status: "error", checkedAt: now(), error: { code: "check-failed", message } });
        }
      }
    })();

    /* Só a própria promessa se limpa. Um `cancel()` + nova checagem deixaria a
       antiga terminar depois, e um `inFlight = null` cego apagaria a referência
       da checagem **nova** — a trava valeria por acidente, não por contrato. */
    const task = inFlight;
    void task.finally(() => {
      if (inFlight === task) inFlight = null;
    });
    return task;
  }

  async function download(): Promise<void> {
    if (downloadInFlight) return downloadInFlight;
    /* Consentimento é o estado `available`. A exceção é a **retentativa**: um
       download que falhou (`error` + `download-failed`) ainda tem o handle da
       atualização, e o botão da tela é "Tentar de novo" — sem esta porta, ele
       seria um botão morto. */
    const retrying = current.status === "error" && current.error?.code === "download-failed";
    if (!announced) return;
    if (current.status !== "available" && !retrying) return;

    const target = announced;
    let lastNotified = Number.NEGATIVE_INFINITY;
    emit({ status: "downloading", receivedBytes: 0, totalBytes: null, error: null });

    downloadInFlight = (async () => {
      try {
        await client.download(
          target,
          (progress) => {
            const complete =
              progress.totalBytes !== null && progress.receivedBytes >= progress.totalBytes;
            const at = now();
            if (!complete && at - lastNotified < PROGRESS_NOTIFY_MS) return;
            lastNotified = at;
            emit({ receivedBytes: progress.receivedBytes, totalBytes: progress.totalBytes });
          },
          { timeout: DOWNLOAD_TIMEOUT_MS }
        );
        emit({ status: "ready" });
      } catch (error) {
        emit({
          status: "error",
          error: { code: "download-failed", message: messageOf(error) },
        });
      } finally {
        downloadInFlight = null;
      }
    })();

    return downloadInFlight;
  }

  function cancel(): void {
    if (current.status === "checking") {
      generation += 1;
      inFlight = null;
      emit({ status: "cancelled", version: null, notes: null });
      return;
    }
    if (current.status === "available") {
      releaseAnnounced();
      emit({ status: "cancelled", version: null, notes: null });
    }
    /* Enquanto baixa, o plugin não oferece interrupção do fluxo de rede:
       inventar um "cancelado" aqui seria mentira — o arquivo continuaria
       chegando. O botão da tela não aparece nesse estado. */
  }

  function scheduleBootCheck(delayMs = BOOT_CHECK_DELAY_MS): () => void {
    if (bootCheckSettled) return () => {};
    if (!cancelScheduled) {
      cancelScheduled = schedule(() => {
        cancelScheduled?.();
        cancelScheduled = null;
        bootCheckSettled = true;
        if (current.status === "idle") void check();
      }, delayMs);
    }
    return () => {
      if (!cancelScheduled) return;
      cancelScheduled();
      cancelScheduled = null;
    };
  }

  return {
    getState: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    check,
    download,
    cancel,
    scheduleBootCheck,
  };
}

/** Instância única da sessão: a paleta e os Ajustes olham o mesmo estado. */
export const updaterService = createUpdaterService();
