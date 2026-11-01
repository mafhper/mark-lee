import React, { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import type { ThemeConfig } from "../../types";

/**
 * Diálogo de conflito externo (`ML-H05`, fecha **P0.5**).
 *
 * **Por que só este diálogo é UI nova:** o resto do fluxo já existia — o selo
 * "Changed on disk" na barra de status, o erro de gravação e as abas. O que
 * faltava era a decisão: quando o arquivo mudou por fora, o app não pode
 * sobrescrever (perde trabalho alheio), nem adotar o disco (perde o trabalho da
 * pessoa) sem perguntar. As quatro ações são as do contrato:
 *
 * - **Recarregar** — lê o disco e descarta o buffer;
 * - **Comparar** — mostra as duas versões aqui mesmo, sem mudar nada;
 * - **Salvar cópia** — grava o buffer em arquivo novo, sem sobrescrever nada;
 * - **Cancelar** — preserva tudo.
 *
 * **A lógica não mora aqui:** quem lê, grava e adota é `conflictResolution.ts`,
 * chamado pelo `App`. Este componente só desenha e devolve a escolha. Assim a
 * garantia "cancelar não faz I/O" é testável sem DOM.
 *
 * **Cancelar é a ação segura**, então é ela que recebe o foco e o `Escape`.
 */

export type ConflictCompareState = "idle" | "loading" | "loaded" | "failed";

interface ConflictModalProps {
  isOpen: boolean;
  fileName: string;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  /** Texto da aba agora, para o "Comparar". */
  buffer: string;
  /** Versão lida do disco; `null` enquanto não foi pedida. */
  diskPreview: string | null;
  compareState: ConflictCompareState;
  onReload: () => void;
  onCompare: () => void;
  onSaveCopy: () => void;
  onCancel: () => void;
}

const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  fileName,
  t,
  tConfig,
  buffer,
  diskPreview,
  compareState,
  onReload,
  onCompare,
  onSaveCopy,
  onCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  /* Escape = Cancelar. O listener vive na janela porque o painel não recebe foco
     sozinho; sem ele, quem navega por teclado só conseguiria desistir clicando. */
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const showCompare = compareState !== "idle";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t["conflict.title"] || "File changed on disk"}
        className={`flex max-h-[85vh] w-[min(90vw,56rem)] flex-col rounded-xl border shadow-2xl ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg}`}
      >
        <div className="flex items-center gap-3 border-b border-opacity-10 border-gray-500 p-4">
          <AlertTriangle size={24} className="text-amber-500" />
          <h2 className="font-semibold">{t["conflict.title"] || "File changed on disk"}</h2>
        </div>

        <div className="overflow-y-auto p-4">
          <p className="text-sm opacity-80">
            {(t["conflict.message"] || "{fileName} was changed by another program.").replace(
              "{fileName}",
              fileName
            )}
          </p>

          {showCompare && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" aria-live="polite">
              {compareState === "loading" && (
                <p className="text-xs opacity-70">{t["conflict.compareLoading"] || "Reading the disk version…"}</p>
              )}
              {compareState === "failed" && (
                <p className="text-xs text-rose-500">
                  {t["conflict.compareUnavailable"] || "Could not read the disk version."}
                </p>
              )}
              {compareState === "loaded" && (
                <>
                  <section aria-label={t["conflict.bufferVersion"] || "Your version"}>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                      {t["conflict.bufferVersion"] || "Your version"}
                    </h3>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded border border-current/10 p-2 text-xs">
                      {buffer}
                    </pre>
                  </section>
                  <section aria-label={t["conflict.diskVersion"] || "Version on disk"}>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                      {t["conflict.diskVersion"] || "Version on disk"}
                    </h3>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded border border-current/10 p-2 text-xs">
                      {diskPreview ?? ""}
                    </pre>
                  </section>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-opacity-10 border-gray-500 p-4">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm opacity-80 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5"
          >
            {t["conflict.cancel"] || "Cancel"}
          </button>
          <button
            type="button"
            onClick={onCompare}
            title={t["conflict.compareHint"] || "Show both versions without changing anything."}
            className="rounded px-4 py-2 text-sm opacity-90 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          >
            {t["conflict.compare"] || "Compare"}
          </button>
          <button
            type="button"
            onClick={onSaveCopy}
            title={t["conflict.saveCopyHint"] || "Writes your version to a new file. Nothing is overwritten."}
            className="rounded px-4 py-2 text-sm text-emerald-600 transition-colors hover:bg-emerald-500/20"
          >
            {t["conflict.saveCopy"] || "Save a copy"}
          </button>
          <button
            type="button"
            onClick={onReload}
            title={t["conflict.reloadHint"] || "Replaces this tab with the version on disk."}
            className="rounded bg-indigo-500 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-indigo-600"
          >
            {t["conflict.reload"] || "Reload"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictModal;
