/**
 * Registro de trabalho prometido do coordenador de ciclo de vida
 * (`ML-H06`, fecha a pendência que o P0.3 deixou aberta).
 *
 * **Por que existe:** o coordenador (`lifecycleCoordinator.ts`) decide **quando**
 * sair e o que fazer com o resultado, mas as superfícies que prometem trabalho
 * por conta própria — o debounce do diário, o guardião de rascunhos, o
 * agendador do editor — não são documentos do editor, então não entram na
 * pergunta de fechamento. Elas chegavam à saída por um registro separado
 * (`features/editor/active-target.ts`) que **quem chama** tinha de lembrar de
 * somar. Toda saída nova nascia, de novo, com a chance de esquecer.
 *
 * Com este registro a conta fica do lado de lá: quem prometeu trabalho se
 * registra, o coordenador consulta, e uma saída que passe por
 * `LifecycleDeps.flush` cobre o diário sem saber que o diário existe.
 *
 * **Sem React, sem Tauri:** recebe funções e devolve contagem de falhas. Um
 * flusher que devolve `false` (ou estoura) conta como falha, porque é assim que
 * o painel do diário informa que a gravação prometida não foi para o disco.
 */
export type PendingFlush = () => void | boolean | Promise<void | boolean>;

export interface PendingWork {
  /** Rótulo da superfície; aparece em teste e em log, não muda comportamento. */
  label: string;
  flush: PendingFlush;
}

export interface PendingWorkFlushResult {
  /** Quantos flushers deixaram trabalho para trás. */
  failures: number;
}

export interface PendingWorkRegistry {
  /** Registra trabalho prometido. Devolve o cancelamento do registro. */
  register(work: PendingWork): () => void;
  /** Descarrega tudo o que está registrado **agora**. */
  flushAll(): Promise<PendingWorkFlushResult>;
  /** Superfícies registradas neste instante. */
  list(): readonly string[];
}

interface Entry {
  label: string;
  flush: PendingFlush;
  /** Quantos registros vivos apontam para este mesmo flusher. */
  refs: number;
}

export function createPendingWorkRegistry(): PendingWorkRegistry {
  // A chave é o próprio flusher: registrar de novo a mesma superfície não pode
  // prometer o mesmo trabalho duas vezes na mesma saída.
  const entries = new Map<PendingFlush, Entry>();

  return {
    register(work) {
      const existing = entries.get(work.flush);
      if (existing) existing.refs += 1;
      else entries.set(work.flush, { label: work.label, flush: work.flush, refs: 1 });

      let active = true;
      return () => {
        if (!active) return;
        active = false;
        const entry = entries.get(work.flush);
        if (!entry) return;
        entry.refs -= 1;
        if (entry.refs <= 0) entries.delete(work.flush);
      };
    },

    async flushAll() {
      // Instantâneo: um flusher que registra outro durante a saída entra na
      // próxima, não no meio desta (a lista mudando durante a iteração é como
      // uma superfície é descarregada duas vezes).
      const flushing = [...entries.values()].map((entry) => entry.flush);
      const results = await Promise.all(
        flushing.map((flush) =>
          Promise.resolve()
            .then(flush)
            .then(
              (ok) => ok !== false,
              () => false
            )
        )
      );
      return { failures: results.filter((ok) => ok === false).length };
    },

    list() {
      return [...entries.values()].map((entry) => entry.label);
    },
  };
}

/**
 * Instância do aplicativo. É a que o painel do diário alimenta e a que o
 * coordenador consulta; os testes criam instâncias próprias.
 */
export const appPendingWork: PendingWorkRegistry = createPendingWorkRegistry();
