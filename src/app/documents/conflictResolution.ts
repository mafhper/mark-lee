/**
 * Conflito externo: o que cada ação do diálogo faz (`ML-H05`, fecha **P0.5**).
 *
 * **Por que existe fora do React:** a parte perigosa não é o modal — é a ordem
 * das operações depois do clique. "Recarregar" precisa ler o disco **antes** de
 * tocar no buffer; "Salvar cópia" precisa escrever em nome livre e nunca no
 * caminho que conflitou; "Cancelar" não pode fazer I/O nenhum. Essas três
 * garantias são contrato, não desenho de tela, e é aqui que elas ficam testáveis
 * sem montar `App`.
 *
 * **O que o módulo não faz:** abrir diálogo, mostrar erro, mudar aba. Ele
 * devolve o que aconteceu e quem aplica é o app — o mesmo desenho de
 * `services/documents.ts` e `closeGuard.ts`.
 *
 * **Uma cópia nunca sobrescreve.** `createExclusive` chega por injeção e o app
 * liga no comando `write_file_new` (Rust: `create_new`). Se o caminho escolhido
 * já existe, o resultado é `failed` e o arquivo existente fica intacto — a
 * garantia é do sistema de arquivos, não de uma checagem `exists()` que qualquer
 * coisa poderia vencer entre a checagem e a escrita.
 */

import { describeFailure } from "../../services/documents.ts";

/** O que o usuário escolheu no diálogo. */
export type ConflictChoice = "reload" | "save-copy" | "cancel";

/** O documento que está em conflito. `path` existe: sem disco não há conflito. */
export interface ConflictDocument {
  documentId: string;
  name: string;
  path: string;
  content: string;
}

/** O subconjunto de `DocumentSession` que as decisões usam. */
export interface ConflictSession {
  adoptDiskContent(path: string, content: string): void;
  trackSavedCopy(path: string, content: string): void;
}

export interface ConflictDeps {
  /** Lê a versão que está no disco agora. */
  readDisk(path: string): Promise<string>;
  /** Pede o destino da cópia. `null` = o usuário desistiu do diálogo. */
  chooseCopyPath(currentName: string): Promise<string | null>;
  /** Grava em nome **livre**; falha se o destino já existe. */
  createExclusive(path: string, content: string): Promise<void>;
  session(documentId: string): ConflictSession;
}

export type ConflictResolution =
  /** O buffer agora é a versão do disco, e ela foi adotada pela sessão. */
  | { kind: "reloaded"; content: string }
  /** O buffer foi gravado no caminho novo, que virou o documento. */
  | { kind: "copy-saved"; path: string }
  /** Nada foi lido, gravado nem adotado. */
  | { kind: "cancelled" }
  | { kind: "failed"; reason: string };

/**
 * Executa a escolha do usuário. **Nunca rejeita**: falha de disco é resultado
 * tipado, como no resto do contrato de gravação.
 */
export async function resolveConflict(
  choice: ConflictChoice,
  document: ConflictDocument,
  deps: ConflictDeps
): Promise<ConflictResolution> {
  if (choice === "cancel") {
    // Nada de I/O: cancelar é sair do diálogo, não sondar o disco.
    return { kind: "cancelled" };
  }

  if (choice === "reload") {
    let content: string;
    try {
      content = await deps.readDisk(document.path);
    } catch (error) {
      // Sem a versão do disco não há o que adotar; o buffer e o conflito ficam
      // exatamente como estavam.
      return { kind: "failed", reason: describeFailure(error) };
    }
    deps.session(document.documentId).adoptDiskContent(document.path, content);
    return { kind: "reloaded", content };
  }

  let path: string | null;
  try {
    path = await deps.chooseCopyPath(document.name);
  } catch (error) {
    return { kind: "failed", reason: describeFailure(error) };
  }
  if (!path) return { kind: "cancelled" };

  try {
    await deps.createExclusive(path, document.content);
  } catch (error) {
    // Inclui "destino já existe": a cópia não sobrescreve, nem por engano.
    return { kind: "failed", reason: describeFailure(error) };
  }

  deps.session(document.documentId).trackSavedCopy(path, document.content);
  return { kind: "copy-saved", path };
}

/** Versão do disco lida para o "Comparar". */
export type DiskVersion =
  | { kind: "loaded"; content: string }
  | { kind: "failed"; reason: string };

/**
 * Lê a versão do disco para exibição. **Não** muda sessão, buffer nem arquivo —
 * comparar é olhar, e o usuário ainda precisa decidir.
 */
export async function loadDiskVersion(
  path: string,
  deps: Pick<ConflictDeps, "readDisk">
): Promise<DiskVersion> {
  try {
    return { kind: "loaded", content: await deps.readDisk(path) };
  } catch (error) {
    return { kind: "failed", reason: describeFailure(error) };
  }
}
