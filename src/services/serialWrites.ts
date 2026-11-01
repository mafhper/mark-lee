/**
 * Fila serial por caminho (`ML-H06`, contrato comum de persistência).
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
