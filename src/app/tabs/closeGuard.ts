/**
 * Guarda de fechamento de abas (`ML-H04`, fecha **P0.2** e **P0.3**).
 *
 * **Por que existe:** o fechamento era um `window.confirm` booleano — "salvar?"
 * — e o resultado da gravação era ignorado. Quem respondia "não" perdia o
 * trabalho em silêncio; gravação que falhava fechava a aba mesmo assim; e
 * `Salvar como` cancelado descartava o documento em memória. Aqui a decisão é
 * tipada (`Salvar`/`Descartar`/`Cancelar`) e **a aba só fecha em `saved` ou
 * `discard`** — `cancelled`, `failed` e `conflict` mantêm tudo aberto com o erro
 * visível na interface.
 *
 * **Sem React, sem DOM:** pergunta, gravação e aplicação entram por injeção.
 * Isso é o que deixa a regra testável fora do app, e é o mesmo desenho de
 * `services/documents.ts`: quem decide o quê não conhece a interface, e a
 * interface não reimplementa a decisão.
 */

import type { SaveOutcome } from "../../services/documents";

/** O que o usuário escolheu na guarda. */
export type CloseDecision = "save" | "discard" | "cancel";

/** O que a guarda precisa saber de uma aba. `DocumentTab` satisfaz isto. */
export interface CloseCandidate {
  id: string;
  name: string;
  dirty: boolean;
}

export interface CloseGuardDeps<T extends CloseCandidate> {
  /** Perguntar ao usuário. **Só** é chamado para aba suja. */
  ask(tab: T): Promise<CloseDecision>;
  /** Gravar. **Só** é chamado para aba suja cuja decisão foi `save`. */
  save(tab: T): Promise<SaveOutcome>;
  /** Aplicar o fechamento de fato. Recebe só as abas liberadas. */
  close(ids: readonly string[]): void;
  /**
   * Uma aba liberada ainda tem trabalho em memória **agora**?
   *
   * A pergunta ao usuário usa o `dirty` de um instantâneo. Entre a resposta e a
   * aplicação existe o I/O de `Salvar`, e uma tecla digitada nesse intervalo
   * produz uma revisão que ninguém perguntou a respeito. Quem responde isto é a
   * sessão do documento (ML-H03), que é a fonte de verdade da revisão — a aba é
   * só a cópia que a interface estava exibindo quando perguntou.
   *
   * Opcional para não obrigar quem já injeta a decisão a conhecer a sessão; sem
   * ele, vale o `dirty` do instantâneo, como era antes.
   */
  stillDirty?(tab: T): boolean;
}

export interface CloseGuardResult {
  closed: string[];
  kept: string[];
  /** `true` quando a operação foi abortada por cancelamento do usuário. */
  cancelled: boolean;
}

/**
 * Fechar `tabs`, pedindo decisão para cada aba suja.
 *
 * **Em duas fases, e isso não é detalhe:** primeiro todas as decisões, depois
 * as gravações, depois o fechamento. Um `Cancelar` na terceira aba de cinco não
 * pode encontrar as duas primeiras já descartadas — "cancelamento real preserva
 * a sessão inteira" é o contrato do ML-H04, e coletar antes de aplicar é o único
 * jeito barato de cumpri-lo.
 *
 * Pela mesma razão um lote com gravação que não deu `saved` não fecha **nada**:
 * fechamento abortado, erro visível, documentos sujos como estavam.
 */
export async function runClose<T extends CloseCandidate>(
  tabs: readonly T[],
  deps: CloseGuardDeps<T>
): Promise<CloseGuardResult> {
  const ids = tabs.map((tab) => tab.id);
  if (ids.length === 0) return { closed: [], kept: [], cancelled: false };

  const toSave: T[] = [];

  // Fase 1 — decisões. Nada foi gravado nem fechado ainda.
  for (const tab of tabs) {
    if (!tab.dirty) continue;
    const decision = await deps.ask(tab);
    if (decision === "cancel") return { closed: [], kept: ids, cancelled: true };
    if (decision === "save") toSave.push(tab);
  }

  // Fase 2 — gravações pedidas. `cancelled` (o usuário desistiu do destino),
  // `failed` e `conflict` abortam o lote inteiro.
  for (const tab of toSave) {
    const outcome = await deps.save(tab);
    if (outcome.kind !== "saved") {
      return { closed: [], kept: ids, cancelled: outcome.kind === "cancelled" };
    }
  }

  /* Fase 3 — re-checagem, antes de aplicar. `discard` é uma resposta sobre o que
     existia na hora da pergunta; uma edição posterior a ela não foi descartada
     por ninguém. As demais abas são revalidadas contra a sessão: se ganharam
     texto durante o I/O de `Salvar`, elas ficam abertas — e o retorno diz isso,
     em vez de fingir que o lote inteiro foi liberado. */
  const stillDirty = deps.stillDirty;
  const discarded = new Set(
    tabs.filter((tab) => tab.dirty && !toSave.includes(tab)).map((tab) => tab.id)
  );
  const dirtyAgain = stillDirty
    ? tabs.filter((tab) => !discarded.has(tab.id) && stillDirty(tab))
    : [];

  if (dirtyAgain.length > 0) {
    const closable = tabs.filter((tab) => !dirtyAgain.includes(tab));
    if (closable.length > 0) deps.close(closable.map((tab) => tab.id));
    return {
      closed: closable.map((tab) => tab.id),
      kept: dirtyAgain.map((tab) => tab.id),
      cancelled: false,
    };
  }

  deps.close(ids);
  return { closed: ids, kept: [], cancelled: false };
}

/**
 * Qual aba fica ativa depois de fechar `closedIds`.
 *
 * A regra é a que o fechamento já tinha — a vizinha da esquerda, senão a da
 * direita —, agora ciente de que várias podem sair no mesmo pedido: com
 * "fechar à direita" a vizinha pode estar indo embora também, e aí o foco
 * precisa pular para a primeira sobrevivente em vez de apontar para uma aba
 * que não existe mais. Sem sobrevivente, não há aba ativa.
 */
export function nextActiveId(
  tabs: readonly { id: string }[],
  closedIds: readonly string[],
  activeId: string | null
): string | null {
  if (!activeId) return null;
  const closing = new Set(closedIds);
  if (!closing.has(activeId)) return activeId;

  const index = tabs.findIndex((tab) => tab.id === activeId);
  if (index === -1) return null;

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (!closing.has(tabs[cursor].id)) return tabs[cursor].id;
  }
  for (let cursor = index + 1; cursor < tabs.length; cursor += 1) {
    if (!closing.has(tabs[cursor].id)) return tabs[cursor].id;
  }
  return null;
}
