import { AlertTriangle, CheckCircle2, DownloadCloud, Loader2, Power, RefreshCw, WifiOff, XCircle } from "lucide-react";

import { UPDATER_CHANNEL, type RestartPreflight, type UpdaterState } from "../../services/updater";
import type { Language } from "../../types";
import { useUpdater } from "../hooks/useUpdater";

/**
 * O cartão de atualização dos Ajustes.
 *
 * **Instalar é o único clique que pode encerrar o app, e ele passa por dois
 * portões.** O primeiro é o estado: o botão só existe em `ready`, que só é
 * alcançado depois de a pessoa pedir para checar e para baixar. O segundo é
 * `prepareRestart` — a pré-autorização do coordenador de ciclo de vida, que
 * grava o pendente e pergunta pelas abas sujas antes de liberar. No Windows o
 * instalador **pode encerrar o app por conta própria**, então perguntar depois
 * do clique seria tarde: a recusa tem de chegar antes de `install()` ser
 * chamado, e é por isso que a licença entra como argumento do serviço.
 *
 * **Nada aqui baixa sozinho.** O único caminho para o binário é o botão
 * "Baixar atualização", e o serviço recusa `download()` fora do estado
 * `available` — a regra mora no serviço, não no `disabled` do botão.
 *
 * **Cor só no ícone.** O texto do pill fica neutro e a cor semântica vive no
 * glifo: os temas do app vão de claro a escuro, e uma cor fixa de texto legível
 * em um é ilegível no outro. Quem lê o pill lê a palavra ("Disponível",
 * "Falha"); a cor acelera, não carrega o significado.
 */

type Props = {
  language: Language;
  /** Acento do tema ativo — o mesmo do botão "Selecionar pasta" dos Ajustes. */
  accentHex: string;
  /** Licença de reinício: quem responde é o coordenador de ciclo de vida. */
  prepareRestart: RestartPreflight;
};

type Tone = "positive" | "warning" | "danger" | "neutral";

const toneIcon: Record<Tone, string> = {
  positive: "text-emerald-500",
  warning: "text-amber-500",
  danger: "text-red-500",
  neutral: "opacity-60",
};

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function UpdaterStatusCard({ language, accentHex, prepareRestart }: Props) {
  const { state, check, download, install, cancel } = useUpdater();
  const tr = (pt: string, en: string, es: string) =>
    language === "en-US" ? en : language === "es-ES" ? es : pt;

  const currentVersion = state.currentVersion ?? __APP_VERSION__;
  const percent =
    state.totalBytes && state.totalBytes > 0
      ? Math.min(100, Math.round((state.receivedBytes / state.totalBytes) * 100))
      : null;

  const status = describeStatus(state, tr, percent);
  const Icon = status.icon;

  const primaryButton = {
    backgroundColor: `${accentHex}20`,
    color: accentHex,
  };

  return (
    <div className="ml-settings-field-block space-y-3 rounded-xl px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">Mark-Lee v{currentVersion}</div>
          <div className="mt-0.5 text-xs opacity-70">
            {tr(`Canal ${UPDATER_CHANNEL}`, `${UPDATER_CHANNEL} channel`, `Canal ${UPDATER_CHANNEL}`)}
          </div>
        </div>
        <span
          role="status"
          aria-live="polite"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--ml-fg,#111827)_10%,transparent)] px-2.5 py-1 text-[11px] font-medium"
        >
          <Icon className={`h-3.5 w-3.5 ${status.spin ? "animate-spin" : ""} ${toneIcon[status.tone]}`} aria-hidden />
          <span className="opacity-85">{status.label}</span>
        </span>
      </div>

      {state.status === "available" || state.status === "ready" ? (
        <p className="text-xs opacity-80">
          {tr(
            `Versão ${state.version} anunciada pelo feed.`,
            `Version ${state.version} announced by the feed.`,
            `Versión ${state.version} anunciada por el feed.`
          )}
        </p>
      ) : null}

      {state.status === "downloading" ? (
        <div className="space-y-1.5">
          <div
            role="progressbar"
            aria-label={tr("Download da atualização", "Update download", "Descarga de la actualización")}
            aria-valuemin={0}
            aria-valuemax={state.totalBytes ?? undefined}
            aria-valuenow={state.totalBytes ? state.receivedBytes : undefined}
            className="h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ml-fg,#111827)_12%,transparent)]"
          >
            <div
              className="h-full rounded-full transition-[width] duration-200"
              style={{ width: percent === null ? "30%" : `${percent}%`, backgroundColor: accentHex }}
            />
          </div>
          <p className="text-xs opacity-70 tabular-nums">
            {percent === null
              ? formatBytes(state.receivedBytes)
              : `${percent}% · ${formatBytes(state.receivedBytes)}${
                  state.totalBytes ? ` / ${formatBytes(state.totalBytes)}` : ""
                }`}
          </p>
        </div>
      ) : null}

      {state.notes && (state.status === "available" || state.status === "ready") ? (
        <p className="max-h-20 overflow-y-auto whitespace-pre-line text-xs opacity-70">{state.notes}</p>
      ) : null}

      {state.status === "ready" ? (
        <p className="text-xs opacity-80">
          {tr(
            "O pacote já está baixado e verificado. Instalar reinicia o app.",
            "The package is downloaded and verified. Installing restarts the app.",
            "El paquete ya está descargado y verificado. Instalar reinicia la app."
          )}
        </p>
      ) : null}

      {state.status === "installing" ? (
        <p className="text-xs opacity-80">
          {tr(
            "Instalando. O app vai fechar e voltar sozinho.",
            "Installing. The app will close and come back on its own.",
            "Instalando. La app se cerrará y volverá sola."
          )}
        </p>
      ) : null}

      {state.status === "ready" && state.installBlocker ? (
        <p className="flex items-start gap-1.5 text-xs" role="status" aria-live="polite">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
          <span className="min-w-0 break-words opacity-85">
            {describeBlocker(state.installBlocker, tr)}{" "}
            {tr(
              "Nada foi instalado e sua sessão continua como estava.",
              "Nothing was installed and your session is exactly as it was.",
              "No se instaló nada y su sesión sigue como estaba."
            )}
          </span>
        </p>
      ) : null}

      {state.status === "error" && state.error ? (
        <p className="flex items-start gap-1.5 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden />
          <span className="min-w-0 break-words opacity-85">{state.error.message}</span>
        </p>
      ) : null}

      {state.status === "offline" ? (
        <p className="text-xs opacity-75">
          {tr(
            "Sem conexão com o feed. A checagem volta a funcionar quando a rede voltar.",
            "No connection to the feed. Checking works again once the network is back.",
            "Sin conexión con el feed. La comprobación vuelve cuando regrese la red."
          )}
        </p>
      ) : null}

      {state.status === "unsupported-platform" ? (
        <p className="text-xs opacity-75">
          {tr(
            "Este ambiente não tem o updater (a janela do navegador não instala pacotes).",
            "This environment has no updater (the browser window cannot install packages).",
            "Este entorno no tiene el actualizador (la ventana del navegador no instala paquetes)."
          )}
        </p>
      ) : null}

      {state.status === "cancelled" ? (
        <p className="text-xs opacity-75">
          {tr("Verificação cancelada.", "Check cancelled.", "Comprobación cancelada.")}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {state.status === "checking" ? (
          <button
            type="button"
            onClick={cancel}
            className="ml-settings-field rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            {tr("Cancelar", "Cancel", "Cancelar")}
          </button>
        ) : null}

        {state.status === "available" ? (
          <>
            <button
              type="button"
              onClick={download}
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={primaryButton}
            >
              {tr("Baixar atualização", "Download update", "Descargar actualización")}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="ml-settings-field rounded-lg border px-3 py-1.5 text-xs font-medium"
            >
              {tr("Dispensar", "Dismiss", "Descartar")}
            </button>
          </>
        ) : null}

        {state.status === "error" && state.error?.code === "download-failed" ? (
          <button
            type="button"
            onClick={download}
            className="ml-settings-field rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            {tr("Tentar de novo", "Try again", "Intentar de nuevo")}
          </button>
        ) : null}

        {state.status === "ready" ? (
          <button
            type="button"
            // A licença é pedida **no clique**: o coordenador grava o pendente e
            // pergunta pelas abas sujas antes de autorizar. Se ele recusar, o
            // serviço não chama o plugin e o motivo aparece no parágrafo acima.
            onClick={() => {
              void install(prepareRestart);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={primaryButton}
          >
            <Power className="h-3.5 w-3.5" aria-hidden />
            {tr("Instalar e reiniciar", "Install and restart", "Instalar y reiniciar")}
          </button>
        ) : null}

        {state.status === "error" && state.error?.code === "install-failed" ? (
          <button
            type="button"
            onClick={() => {
              void install(prepareRestart);
            }}
            className="ml-settings-field rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            {tr("Tentar instalar de novo", "Try installing again", "Intentar instalar de nuevo")}
          </button>
        ) : null}

        {state.status === "error" && state.error?.code === "check-failed" ? (
          <button
            type="button"
            onClick={check}
            className="ml-settings-field inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            {tr("Tentar de novo", "Try again", "Intentar de nuevo")}
          </button>
        ) : null}

        {state.status === "idle" || state.status === "cancelled" || state.status === "offline" ? (
          <button
            type="button"
            onClick={check}
            className="ml-settings-field inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            {tr("Buscar atualizações", "Check for updates", "Buscar actualizaciones")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Por que o reinício não foi autorizado, em linguagem de tela.
 *
 * Os códigos vêm do coordenador de ciclo de vida (`LifecycleBlocker`), e o
 * cartão não os interpreta: só traduz. Um código novo cai no texto genérico, que
 * continua sendo verdade — o app não vai reiniciar agora.
 */
function describeBlocker(blocker: string, tr: (pt: string, en: string, es: string) => string): string {
  switch (blocker) {
    case "cancelled":
      return tr(
        "Reinício cancelado.",
        "Restart cancelled.",
        "Reinicio cancelado."
      );
    case "not_released":
      return tr(
        "Um documento não terminou de ser gravado.",
        "A document could not finish saving.",
        "Un documento no terminó de guardarse."
      );
    case "pending_flush_failed":
      return tr(
        "Uma alteração prometida não chegou ao disco.",
        "A promised change did not reach disk.",
        "Un cambio prometido no llegó al disco."
      );
    default:
      return tr(
        "A sessão não pôde ser preparada para reiniciar.",
        "The session could not be prepared to restart.",
        "La sesión no pudo prepararse para reiniciar."
      );
  }
}

function describeStatus(
  state: UpdaterState,
  tr: (pt: string, en: string, es: string) => string,
  percent: number | null
): { label: string; tone: Tone; icon: typeof CheckCircle2; spin?: boolean } {
  switch (state.status) {
    case "checking":
      return {
        label: tr("Verificando", "Checking", "Comprobando"),
        tone: "neutral",
        icon: Loader2,
        spin: true,
      };
    case "available":
      return {
        label: tr("Disponível", "Available", "Disponible"),
        tone: "positive",
        icon: DownloadCloud,
      };
    case "downloading":
      return {
        label: percent === null ? tr("Baixando", "Downloading", "Descargando") : `${percent}%`,
        tone: "warning",
        icon: Loader2,
        spin: true,
      };
    case "ready":
      return {
        label: tr("Pronto para instalar", "Ready to install", "Listo para instalar"),
        tone: "positive",
        icon: CheckCircle2,
      };
    case "installing":
      return {
        label: tr("Instalando", "Installing", "Instalando"),
        tone: "warning",
        icon: Loader2,
        spin: true,
      };
    case "offline":
      return {
        label: tr("Sem conexão", "Offline", "Sin conexión"),
        tone: "warning",
        icon: WifiOff,
      };
    case "unsupported-platform":
      return {
        label: tr("Indisponível", "Unavailable", "No disponible"),
        tone: "neutral",
        icon: AlertTriangle,
      };
    case "cancelled":
      return {
        label: tr("Cancelada", "Cancelled", "Cancelada"),
        tone: "neutral",
        icon: XCircle,
      };
    case "error":
      return {
        label:
          state.error?.code === "download-failed"
            ? tr("Falha no download", "Download failed", "Fallo en la descarga")
            : state.error?.code === "install-failed"
              ? tr("Falha na instalação", "Install failed", "Fallo en la instalación")
              : tr("Falha na verificação", "Check failed", "Fallo en la comprobación"),
        tone: "danger",
        icon: XCircle,
      };
    default:
      return state.checkedAt === null
        ? {
            label: tr("Nunca verificada", "Not checked yet", "Nunca comprobada"),
            tone: "neutral",
            icon: AlertTriangle,
          }
        : {
            label: tr("Atualizado", "Up to date", "Actualizado"),
            tone: "positive",
            icon: CheckCircle2,
          };
  }
}
