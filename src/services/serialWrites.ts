/**
 * Fila serial por caminho (H05, escopo local: contrato comum de persistência).
 *
 * **Por que existe:** o Editor já tem, no `DocumentSession` (ML-H03), a garantia
 * de que duas gravações do mesmo documento nunca correm juntas: o pedido entra
 * numa fila por documento e o segundo só lê a referência de disco depois que o
 * primeiro terminou. As Memórias não tinham equivalente. O painel de entrada
 * serializava as **suas** gravações, mas o mesmo arquivo também é escrito pelo
 * favorito da lista, pelo tracker de Pins e pela galeria — cada um com a sua
 * chamada solta a `saveEntry`. Dois read-modify-write concorrentes leem o mesmo
 * valor e o último a gravar apaga a mudança do outro; no manifesto do caderno o
 * mesmo padrão fazia uma alteração de configuração desaparecer.
 *
 * **O que este módulo garante:** tarefas do mesmo caminho rodam **uma de cada
 * vez**, na ordem em que foram pedidas, e a falha de uma não impede a seguinte
 * de rodar (ela é quem decide se o caminho ainda está gravável). Caminhos
 * diferentes não se esperam — cadernos distintos não compartilham fila.
 *
 * **Sem `invoke`, sem React:** recebe a tarefa e devolve o resultado dela. A
 * gravação em si continua sendo `atomicWriteText`, o primitivo seguro do ML-H02.
 *
 * ## O contrato comum de persistência — e onde ele não é comum
 *
 * Editor e Memórias **não** compartilham um detector de conflito; compartilham o
 * desenho, e é isso que faz dos dois um contrato só. São três camadas:
 *
 * 1. **primitivo** — `atomic_write_text` → `safe_write` no backend (temporário
 *    único, `sync_all`, troca sem remover o destino antes). Nenhum escritor de
 *    texto da casa sai por `fs::write` direto; `write_file` continua existindo por
 *    histórico, mas hoje chama o mesmo `safe_write`.
 * 2. **fila serial por caminho** — este módulo. Duas gravações do mesmo arquivo
 *    nunca correm juntas; caminhos diferentes não se esperam.
 * 3. **resultado tipado na borda** — quem grava **devolve** o que aconteceu:
 *    `saved`/`cancelled`/`conflict`/`failed` no editor (`services/documents.ts`)
 *    ou `ConflictError` no diário (`entry-service.ts`). Não existe "salvou, mas…".
 *
 * **O detector de conflito difere de propósito, e a diferença é documentada:**
 * o editor compara **fingerprint de conteúdo** (`fingerprintContent` sobre o que
 * a sessão leu/gravou), porque o documento é dele e o texto inteiro está em
 * memória; o diário compara **mtime** (`captureMtime` antes e depois), porque o
 * mesmo arquivo é escrito por várias superfícies e o painel não carrega o
 * arquivo todo a cada tecla. Os dois bloqueiam a **mesma** falta: sobrescrever em
 * silêncio uma versão que o app não viu. Trocar o detector de um lado não muda o
 * contrato do outro — mudar o primitivo, a fila ou o formato do resultado, sim.
 */
export interface SerialWrites {
  /**
   * Enfileira `task` no caminho. Resolve/rejeita com o resultado **desta**
   * tarefa; a próxima só começa depois que esta assentar.
   */
  run<T>(path: string, task: () => Promise<T>): Promise<T>;
  /** `true` enquanto houver tarefa pendente ou em execução para o caminho. */
  pending(path: string): boolean;
}

export function createSerialWrites(): SerialWrites {
  const queues = new Map<string, Promise<unknown>>();

  return {
    run<T>(path: string, task: () => Promise<T>): Promise<T> {
      const previous = queues.get(path);
      // `then(task, task)` de propósito: uma tarefa anterior que falhou não pode
      // deixar a fila travada — o trabalho que já estava prometido ainda tem de
      // ser tentado.
      const run = previous ? previous.then(task, task) : task();

      const tail = run.then(
        () => undefined,
        () => undefined
      );
      queues.set(path, tail);
      // A fila do caminho deixa de existir quando a última tarefa assenta; sem
      // isso o mapa cresceria com um caminho por entrada já gravada.
      void tail.then(() => {
        if (queues.get(path) === tail) queues.delete(path);
      });

      return run;
    },

    pending(path: string): boolean {
      return queues.has(path);
    },
  };
}
