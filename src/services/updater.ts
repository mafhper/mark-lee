import type { LifecycleBlocker, RestartVerdict } from "../app/documents/lifecycleCoordinator.ts";
import { isTauriRuntime } from "./runtime.ts";

/**
 * Updater do Tauri — checagem, download e instalação (`ML-H06`).
 *
 * **Por que existe:** o app não tinha updater nenhum: quem já instalou o
 * Mark-Lee dependia de baixar o instalador à mão. O plano ML-H06 pede a
 * máquina de estados completa e a instalação atrás de consentimento; aqui estão
 * `idle → checking → available → downloading → ready → installing → installed`
 * (mais `cancelled`, `offline`, `unsupported-platform` e `error`).
 *
 * **O que este módulo não sabe:** React, DOM e a forma da tela. Ele expõe um
 * estado observável e quatro verbos (`check`, `download`, `cancel`, `install`).
 * Quem fala com o plugin é o `UpdaterClient` injetado — e é por essa porta que
 * os testes provam as regras sem tocar em Tauri.
 *
 * **As cinco regras que sustentam o desenho:**
 *
 * 1. **Baixar exige consentimento.** `download()` só age no estado `available`.
 *    Não existe caminho de download automático: o boot faz *uma* checagem de
 *    metadados, e o binário só desce quando a pessoa pede.
 * 2. **Instalar exige dois portões, e nenhum deles se basta.** O primeiro é o
 *    estado `ready` — que só existe depois de dois pedidos explícitos (checar e
 *    baixar). O segundo é o veredito de quem sabe se a sessão pode ser
 *    encerrada agora: no Windows o instalador **pode encerrar o app por conta
 *    própria**, então perguntar depois seria tarde. `install()` recebe esse
 *    veredito como argumento — não há default permissivo, e um preflight que
 *    estoura conta como recusa.
 * 3. **Uma checagem de boot por sessão.** A trava mora no serviço, e não no
 *    efeito do React: duplo mount (StrictMode) agenda duas vezes e cabe ao
 *    serviço recusar a segunda — uma requisição por sessão, não duas.
 * 4. **Cancelar é definitivo para aquela checagem.** O resultado tardio é
 *    descartado por geração, senão a tela oferece baixar o que a pessoa
 *    acabou de dispensar.
 * 5. **`installing` tem saída em todos os SOs.** No Windows o processo morre no
 *    meio — o instalador encerra o app —, mas em macOS/Linux a promessa de
 *    `install()` **resolve** e o processo segue rodando o binário antigo: quem
 *    o troca é `relaunch()`. Se o relançamento falhar, a tela diz para abrir de
 *    novo; ela nunca fica girando em `installing`.
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
  | "installing"
  | "installed"
  | "cancelled"
  | "offline"
  | "unsupported-platform"
  | "error";

export type UpdaterErrorCode =
  | "check-failed"
  | "download-failed"
  | "install-failed"
  /** O pacote foi aplicado, mas o app não conseguiu voltar sozinho. */
  | "relaunch-failed";

/**
 * Onde o app roda — e, com isso, **quem o traz de volta** depois de instalar.
 *
 * No Windows quem sobe a versão nova é o instalador: `install()` não resolve,
 * porque o processo é encerrado. No macOS e no Linux o pacote é trocado no
 * disco e a promessa resolve; o processo em memória continua o antigo, e quem o
 * substitui é `relaunch()`.
 */
export type UpdaterPlatform = "windows" | "unix";

/**
 * Por que a última instalação **não começou**.
 *
 * Os motivos do coordenador vêm do tipo dele, e não de uma cópia local: ele é o
 * dono do vocabulário, e uma segunda lista divergiria em silêncio. O único
 * código que nasce aqui é `preflight-failed` — o preflight não deu veredito
 * (estourou, ou recusou sem dizer por quê). Antes isto era `string` com a
 * mensagem crua da exceção, que a tela não tinha como traduzir.
 */
export type InstallBlocker = LifecycleBlocker | "preflight-failed";

export interface UpdaterState {
  status: UpdaterStatus;
  /** Plataforma resolvida na criação do serviço: a tela diz quem reinicia. */
  platform: UpdaterPlatform;
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
  /**
   * Por que o último pedido de instalação **não começou**. Não é `error`: nada
   * falhou — a sessão não estava pronta para encerrar. `null` quando não houve
   * recusa (ou quando a instalação foi autorizada).
   */
  installBlocker: InstallBlocker | null;
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
  /** Instala o pacote **já baixado**. No Windows isto encerra o app depois de
   *  lançar o instalador — é por isso que a chamada é gated. */
  install(update: CheckedUpdate): Promise<void>;
  /** Sobe o app de novo depois de uma instalação que **resolveu**. É o caminho
   *  de macOS/Linux; no Windows quem reinicia é o instalador. */
  relaunch(): Promise<void>;
  /** Solta o recurso do plugin quando a atualização é dispensada sem instalar. */
  close(update: CheckedUpdate): Promise<void>;
}

/**
 * O veredito de quem sabe se a sessão pode ser encerrada **agora**.
 *
 * O tipo é do coordenador de ciclo de vida (`RestartVerdict`): ele é quem
 * responde, e o updater só olha `allowed`. O `blocker` dele é tipado
 * (`LifecycleBlocker`), e é esse vocabulário que a tela traduz — não há
 * mensagem crua atravessando a fronteira.
 *
 * **Um nome por conceito:** a **função** que produz o veredito chama-se
 * `RestartPreflight`; o **dado** chama-se `RestartVerdict`.
 */
export type RestartPreflight = () => Promise<RestartVerdict>;

/** O que aconteceu com o pedido de instalação. `installed: false` **não** é
 *  erro: a instalação não começou e a sessão continua exatamente como estava. */
export interface InstallOutcome {
  installed: boolean;
  blocker: "not-consented" | "preflight-refused" | "install-failed" | null;
}

export interface UpdaterServiceOptions {
  client?: UpdaterClient;
  /** Fora do WebView do Tauri não há plugin: a tela mostra o motivo em vez de falhar. */
  supported?: () => boolean;
  online?: () => boolean;
  now?: () => number;
  /** Plataforma detectada. Injetável porque a decisão de relançar depende dela
   *  e o teste roda num host só. */
  platform?: () => UpdaterPlatform;
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
  /**
   * Instalar o pacote já baixado. Exige **os dois portões**: o estado `ready`
   * (consentimento de quem pediu para baixar e agora pede para instalar) e um
   * `preflight` que responda `allowed`. O preflight é argumento obrigatório:
   * não existe caminho para instalar sem alguém dizer que a sessão pode
   * terminar.
   */
  install(preflight: RestartPreflight): Promise<InstallOutcome>;
  cancel(): void;
  /** Devolve o cancelamento do agendamento, para o efeito do React limpar. */
  scheduleBootCheck(delayMs?: number): () => void;
}

function initialState(platform: UpdaterPlatform): UpdaterState {
  return {
    status: "idle",
    platform,
    currentVersion: null,
    version: null,
    notes: null,
    checkedAt: null,
    receivedBytes: 0,
    totalBytes: null,
    error: null,
    installBlocker: null,
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

/** A plataforma do WebView. `navigator.userAgent` a informa nos três motores que
 *  o Tauri usa no desktop (WebView2 "Windows NT", WKWebView "Macintosh",
 *  WebKitGTK "Linux"), e o updater só precisa de uma pergunta binária: quem
 *  reinicia. Não há `tauri-plugin-os` nesta instalação, e um plugin novo por
 *  causa de uma expressão regular seria dependência a mais para pagar. */
function detectPlatform(): UpdaterPlatform {
  if (typeof navigator === "undefined") return "unix";
  return /Windows/i.test(navigator.userAgent) ? "windows" : "unix";
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
    async install(update) {
      const handle = handles.get(update);
      if (!handle) {
        throw new Error("Atualização sem handle: faça a checagem antes de instalar.");
      }
      // No Windows esta promessa não resolve: o plugin lança o instalador e
      // encerra o processo. Em macOS/Linux ela resolve — e quem sobe o app de
      // novo é o `relaunch()` abaixo, chamado pelo serviço.
      await handle.install();
    },
    async relaunch() {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    },
  };
}

export function createUpdaterService(options: UpdaterServiceOptions = {}): UpdaterService {
  const client = options.client ?? createTauriClient();
  const supported = options.supported ?? (() => isTauriRuntime());
  const online = options.online ?? (() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const now = options.now ?? (() => Date.now());
  const platform = options.platform ?? detectPlatform;
  const schedule = options.schedule ?? defaultSchedule;

  const listeners = new Set<(state: UpdaterState) => void>();
  let current = initialState(platform());
  let announced: CheckedUpdate | null = null;
  let inFlight: Promise<void> | null = null;
  let downloadInFlight: Promise<void> | null = null;
  let installInFlight: Promise<InstallOutcome> | null = null;
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
    if (
      current.status === "downloading" ||
      current.status === "ready" ||
      current.status === "installing" ||
      current.status === "installed"
    ) {
      return;
    }

    bootCheckSettled = true;
    if (cancelScheduled) {
      cancelScheduled();
      cancelScheduled = null;
    }

    if (!supported()) {
      emit({ ...initialState(platform()), status: "unsupported-platform", checkedAt: now() });
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
      installBlocker: null,
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
    emit({
      status: "downloading",
      receivedBytes: 0,
      totalBytes: null,
      error: null,
      installBlocker: null,
    });

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

  /**
   * Instalação: o único verbo que pode encerrar o app.
   *
   * **Portão 1 — consentimento.** `ready` só é alcançado por `download()`, que
   * só age em `available`, que só existe depois de `check()`. Instalar de
   * qualquer outro estado devolve `not-consented` **sem** consultar o
   * coordenador: não se pede licença para uma saída que não vai acontecer. A
   * exceção é a retentativa de uma instalação que falhou ao lançar.
   *
   * **Portão 2 — preflight.** Consultar depois seria tarde: no Windows o
   * instalador pode encerrar o app por conta própria. Enquanto o veredito é
   * `allowed`, a atualização fica onde estava — recusar não custa o download.
   *
   * **Todos os caminhos terminam fora de `installing`.** Em macOS/Linux a
   * instalação resolve e o app precisa voltar pelo `relaunch()`; se ele falhar,
   * o estado vai para `installed` com `relaunch-failed`, e a tela manda abrir de
   * novo.
   */
  async function install(preflight: RestartPreflight): Promise<InstallOutcome> {
    if (installInFlight) return installInFlight;

    const retrying = current.status === "error" && current.error?.code === "install-failed";
    if ((current.status !== "ready" && !retrying) || !announced) {
      return { installed: false, blocker: "not-consented" };
    }

    const target = announced;

    /* A retentativa começa limpa. O erro anterior descrevia a tentativa passada;
       mantê-lo faria a recusa nova aparecer em cima da falha velha. O pacote
       continua baixado, então `ready` é o estado verdadeiro enquanto o preflight
       roda. A limpeza acontece antes da promessa, para que a tela nunca observe
       o estado novo misturado com o antigo. */
    if (retrying) emit({ status: "ready", error: null, installBlocker: null });

    installInFlight = (async (): Promise<InstallOutcome> => {
      try {
        let verdict: RestartVerdict;
        try {
          verdict = await preflight();
        } catch {
          // Preflight que estoura não é licença. Fail closed: sem veredito, não
          // instala. O motivo vira código (`preflight-failed`) — a mensagem da
          // exceção não é traduzível e não atravessa a fronteira da tela.
          emit({ installBlocker: "preflight-failed" });
          return { installed: false, blocker: "preflight-refused" };
        }
        if (!verdict.allowed) {
          // `cancelled` é o motivo mais comum (a pessoa desistiu na guarda), mas
          // o serviço não interpreta: repassa o código que o coordenador deu.
          emit({ installBlocker: verdict.blocker ?? "preflight-failed" });
          return { installed: false, blocker: "preflight-refused" };
        }

        emit({ status: "installing", installBlocker: null, error: null });

        try {
          await client.install(target);
        } catch (error) {
          // No Windows este caminho é raro (o app já morreu); em macOS/Linux é o
          // normal quando o instalador falha. A atualização continua baixada.
          emit({
            status: "error",
            error: { code: "install-failed", message: messageOf(error) },
          });
          return { installed: false, blocker: "install-failed" };
        }

        /* A instalação **resolveu** — fora do Windows isso é o normal: o binário
           do disco já é o novo e o processo em memória, não. Quem troca o
           processo é `relaunch()`; sem ele o app seguiria rodando o código
           antigo dizendo ter instalado o novo. No Windows quem reinicia é o
           instalador, e chegar aqui significa que ele voltou sem levar o
           processo: relançar seria subir uma segunda instância. */
        try {
          if (platform() === "unix") await client.relaunch();
        } catch (error) {
          // O pacote está instalado; o que falhou foi voltar. A tela precisa
          // dizer isso em vez de girar para sempre em `installing`.
          emit({
            status: "installed",
            error: { code: "relaunch-failed", message: messageOf(error) },
          });
          return { installed: true, blocker: null };
        }

        emit({ status: "installed" });
        return { installed: true, blocker: null };
      } finally {
        /* A trava é do pedido inteiro, e não só do `client.install`: uma recusa
           no preflight também precisa soltá-la, senão a primeira recusa
           envenenaria todas as tentativas seguintes. */
        installInFlight = null;
      }
    })();

    return installInFlight;
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
    install,
    cancel,
    scheduleBootCheck,
  };
}

/** Instância única da sessão: a paleta e os Ajustes olham o mesmo estado. */
export const updaterService = createUpdaterService();
