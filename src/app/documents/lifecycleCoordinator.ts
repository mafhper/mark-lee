/**
 * Coordenador único de ciclo de vida (`ML-H05`, fecha **P0.3**).
 *
 * **Por que existe:** as saídas do aplicativo cada uma fazia a sua própria
 * conta. Fechar aba passava pela guarda do ML-H04, mas sair do app só chamava o
 * flush do diário — uma aba do editor suja podia ser encerrada sem pergunta; e
 * trocar de workspace, apagar arquivo e "Arquivo → Novo" tinham, cada um, a sua
 * ideia de quando perguntar. O P0.3 pede **um** ponto consultado por todas
 * elas, para que a saída nova que alguém adicionar amanhã não nasça sem ele.
 *
 * **O que ele decide:** quais documentos entram na pergunta, em que ordem o
 * trabalho pendente é escrito e o que acontece quando a resposta não libera a
 * saída. Cancelar preserva a sessão inteira — nada é aplicado.
 *
 * **Sem React, sem DOM:** candidatos, pergunta, gravação, aplicação e flush
 * entram por injeção, e o fechamento em si continua em `runClose` (ML-H04). O
 * coordenador não reimplementa a regra "só fecha em `saved` ou `discard`" — ele
 * decide **quando** chamá-la e **o que** fazer com o resultado.
 */

import { runClose, type CloseCandidate, type CloseDecision } from "../tabs/closeGuard.ts";
import type { SaveOutcome } from "../../services/documents.ts";
import { isSameOrInsidePath } from "./paths.ts";

/** O que o coordenador precisa saber de um documento. `DocumentTab` satisfaz. */
export interface LifecycleCandidate extends CloseCandidate {
  path: string | null;
}

/** Qual saída está pedindo decisão. Vira rótulo em log/teste, não comportamento. */
export type LifecycleIntent = "close" | "replace" | "switch-workspace" | "exit" | "destructive";

/**
 * Por que a saída não seguiu. `null` = seguiu.
 *
 * `not_released` cobre os dois jeitos de a guarda não liberar: a gravação pedida
 * não terminou em `saved` (falhou, conflitou, ou o usuário desistiu do destino),
 * ou a aba liberada voltou a ficar suja durante o I/O de `Salvar`.
 */
export type LifecycleBlocker = "cancelled" | "not_released" | "pending_flush_failed";

export interface LifecycleResult {
  intent: LifecycleIntent;
  /** `true` quando a operação pode ser aplicada — a guarda liberou tudo. */
  proceeded: boolean;
  cancelled: boolean;
  /** Documentos liberados pela guarda. Em `close`, são os que foram fechados. */
  released: string[];
  /** Documentos que ficaram abertos, com o trabalho deles intacto. */
  kept: string[];
  blocker: LifecycleBlocker | null;
}

export interface LifecycleDeps<T extends LifecycleCandidate> {
  /** Documentos com trabalho em memória, lidos **agora** (nunca de um render). */
  candidates(): readonly T[];
  ask(tab: T): Promise<CloseDecision>;
  save(tab: T): Promise<SaveOutcome>;
  /** Aplicar o fechamento das abas liberadas. Só o `close` o usa. */
  close(ids: readonly string[]): void;
  /** Autosaves prometidos (diário + editor). Devolve quantos falharam. */
  flush(): Promise<number>;
  /**
   * A aba liberada ainda tem trabalho em memória **neste instante**? É a
   * re-checagem que o ML-H04 deixou anotada: a decisão foi tomada sobre um
   * instantâneo, e uma edição que chegue durante o I/O de `Salvar` não pode ser
   * fechada por causa de uma resposta antiga.
   */
  stillDirty?(tab: T): boolean;
}

export interface DocumentLifecycleCoordinator<T extends LifecycleCandidate> {
  /** Fechar abas. `close` troca quem aplica; o padrão é `deps.close`. */
  requestClose(
    tabs: readonly T[],
    close?: (ids: readonly string[]) => void
  ): Promise<LifecycleResult>;
  /** "Arquivo → Novo" sobre um documento em memória: `proceed` cria o novo. */
  requestReplace(tabs: readonly T[], proceed: () => void | Promise<void>): Promise<LifecycleResult>;
  /** Trocar de workspace: escreve o pendente, depois pergunta pelo resto. */
  requestWorkspaceSwitch(proceed: () => void | Promise<void>): Promise<LifecycleResult>;
  /** Sair ou reiniciar (inclusive instalar atualização). */
  requestExit(proceed: () => void | Promise<void>): Promise<LifecycleResult>;
  /** Apagar/mover `target`: não passa por cima de buffer sujo de dentro dele. */
  requestDestructive(target: string, proceed: () => void | Promise<void>): Promise<LifecycleResult>;
}

export function createDocumentLifecycleCoordinator<T extends LifecycleCandidate>(
  deps: LifecycleDeps<T>
): DocumentLifecycleCoordinator<T> {
  const stillDirty = deps.stillDirty;

  const guard = (tabs: readonly T[], close: (ids: readonly string[]) => void) =>
    runClose(tabs, { ask: deps.ask, save: deps.save, close, stillDirty });

  /** Traduz o resultado da guarda para a resposta do ciclo de vida. */
  const settle = (
    intent: LifecycleIntent,
    released: { closed: string[]; kept: string[]; cancelled: boolean }
  ): LifecycleResult => {
    if (released.cancelled) {
      return {
        intent,
        proceeded: false,
        cancelled: true,
        released: [],
        kept: [...released.kept],
        blocker: "cancelled",
      };
    }
    if (released.kept.length > 0) {
      // A guarda devolve `kept` quando a gravação pedida não terminou em `saved`
      // (falhou, conflitou ou o usuário desistiu do destino) — e agora também
      // quando uma aba liberada voltou a ficar suja. Nos dois casos a saída para;
      // as abas que a guarda conseguiu aplicar continuam em `released`, porque
      // omiti-las faria quem chama achar que nada foi fechado.
      return {
        intent,
        proceeded: false,
        cancelled: false,
        released: [...released.closed],
        kept: [...released.kept],
        blocker: "not_released",
      };
    }
    return {
      intent,
      proceeded: true,
      cancelled: false,
      released: [...released.closed],
      kept: [],
      blocker: null,
    };
  };

  /**
   * Sair, reiniciar e trocar de workspace fazem a mesma coisa, nesta ordem:
   * escreve o que o autosave já prometeu, pergunta pelo que sobrou sujo, e só
   * então aplica. A ordem importa — perguntar antes de escrever pediria decisão
   * sobre um documento que o autosave ia salvar sozinho.
   */
  const flushThenRelease = async (
    intent: LifecycleIntent,
    proceed: () => void | Promise<void>
  ): Promise<LifecycleResult> => {
    let failures = 0;
    try {
      failures = await deps.flush();
    } catch {
      // Flush que estoura é trabalho que pode não ter ido para o disco.
      failures = 1;
    }

    const released = await guard(deps.candidates(), () => undefined);
    const result = settle(intent, released);
    if (!result.proceeded) return result;

    if (failures > 0) {
      // Documentos do editor estão resolvidos, mas o flush do diário/editor
      // deixou trabalho para trás. Quem sabe se dá para perder é o usuário — a
      // decisão continua explícita, só não é feita aqui.
      return {
        intent,
        proceeded: false,
        cancelled: false,
        released: result.released,
        kept: [],
        blocker: "pending_flush_failed",
      };
    }

    await proceed();
    return result;
  };

  return {
    async requestClose(tabs, close) {
      const released = await guard(tabs, close ?? deps.close);
      return settle("close", released);
    },

    async requestReplace(tabs, proceed) {
      // Substituir o documento é fechar o antigo em memória e abrir outro: a
      // guarda decide o destino do texto, e `proceed` só roda se ela liberar.
      const released = await guard(tabs, () => undefined);
      const result = settle("replace", released);
      if (!result.proceeded) return result;
      await proceed();
      return result;
    },

    requestWorkspaceSwitch(proceed) {
      return flushThenRelease("switch-workspace", proceed);
    },

    requestExit(proceed) {
      return flushThenRelease("exit", proceed);
    },

    async requestDestructive(target, proceed) {
      // Só entram os documentos que o alvo alcança: apagar `notas/` não pode
      // pedir decisão sobre um rascunho aberto de outra pasta.
      const affected = deps.candidates().filter(
        (tab) => tab.path !== null && isSameOrInsidePath(target, tab.path)
      );
      const released = await guard(affected, () => undefined);
      const result = settle("destructive", released);
      if (!result.proceeded) return result;
      await proceed();
      return result;
    },
  };
}
