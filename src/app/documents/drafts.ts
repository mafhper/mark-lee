/**
 * Rascunhos duráveis e recuperação na abertura (`ML-H05`).
 *
 * **Por que existe:** até aqui a única cópia de uma aba sem caminho e de uma
 * edição não salva era o `localStorage` do webview. Isso é cache: some quando o
 * armazenamento do webview é limpo, sem erro e sem aviso. O ML-H05 pede o
 * rascunho no **armazenamento durável do aplicativo** — um arquivo por documento
 * em `<app-data>/recovery/drafts`, escrito por troca atômica pelo backend.
 *
 * **A fronteira:** o backend grava bytes opacos; aqui mora o formato do rascunho
 * (nome, caminho, conteúdo, hash de disco) e a decisão de **o que recuperar**.
 * Um rascunho que não valida é **ignorado, não apagado**: dado que não se
 * entende não é lixo, é dado de uma versão que este código não conhece.
 *
 * **`localStorage` continua sendo cache.** A sessão de abas (quais abas, qual
 * ativa) segue nele porque é estado de interface — perdê-lo é chato, não é
 * perda de texto. O conteúdo sujo, que não pode sumir, mora no arquivo.
 */

import type { DocumentTab } from "../../types";

/** Versão do formato. Um payload de versão diferente é ignorado (e preservado). */
export const DRAFT_SCHEMA_VERSION = 1;

export interface DocumentDraft {
  documentId: string;
  name: string;
  path: string | null;
  content: string;
  /** Fingerprint do disco que a sessão acreditava ter quando o rascunho foi escrito. */
  diskHash: string | null;
  /** `false` nunca é escrito pelo guardião; é lido como rascunho obsoleto. */
  dirty: boolean;
  origin?: DocumentTab["origin"];
  savedAt: number;
}

/** O que o backend devolve: o id vem do nome do arquivo, o resto é opaco. */
export interface StoredDraftPayload {
  document_id: string;
  payload: string;
}

export interface DraftBackend {
  write(documentId: string, payload: string): Promise<void>;
  list(): Promise<StoredDraftPayload[]>;
  remove(documentId: string): Promise<void>;
}

export interface DraftStore {
  write(draft: DocumentDraft): Promise<void>;
  list(): Promise<DocumentDraft[]>;
  remove(documentId: string): Promise<void>;
}

const ORIGINS: ReadonlySet<string> = new Set(["workspace", "external", "untitled"]);

export function serializeDraft(draft: DocumentDraft): string {
  return JSON.stringify({ schemaVersion: DRAFT_SCHEMA_VERSION, ...draft });
}

/**
 * Valida e reconstrói um rascunho. O `documentId` **vem do arquivo**, não do
 * payload: é o backend que garante a identidade (nome validado), e um payload
 * que discordasse dele não pode renomear a aba.
 */
export function parseDraft(documentId: string, payload: string): DocumentDraft | null {
  if (!documentId) return null;
  let raw: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    raw = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  if (raw.schemaVersion !== DRAFT_SCHEMA_VERSION) return null;
  if (typeof raw.content !== "string") return null;
  if (typeof raw.dirty !== "boolean") return null;

  const name = typeof raw.name === "string" && raw.name.length > 0 ? raw.name : "Untitled.md";
  const path = typeof raw.path === "string" && raw.path.length > 0 ? raw.path : null;
  const diskHash = typeof raw.diskHash === "string" && raw.diskHash.length > 0 ? raw.diskHash : null;
  const origin =
    typeof raw.origin === "string" && ORIGINS.has(raw.origin)
      ? (raw.origin as NonNullable<DocumentTab["origin"]>)
      : undefined;
  const savedAt = typeof raw.savedAt === "number" && Number.isFinite(raw.savedAt) ? raw.savedAt : 0;

  return { documentId, name, path, content: raw.content, diskHash, dirty: raw.dirty, origin, savedAt };
}

export function createDraftStore(backend: DraftBackend): DraftStore {
  return {
    async write(draft) {
      await backend.write(draft.documentId, serializeDraft(draft));
    },
    async list() {
      const stored = await backend.list();
      const drafts: DocumentDraft[] = [];
      for (const entry of stored) {
        const draft = parseDraft(entry.document_id, entry.payload);
        if (draft) drafts.push(draft);
        else console.warn(`Rascunho ignorado (formato desconhecido): ${entry.document_id}`);
      }
      return drafts;
    },
    async remove(documentId) {
      await backend.remove(documentId);
    },
  };
}

export interface DraftRecovery {
  /** Abas depois da recuperação: as do cache, com o rascunho adotado quando havia. */
  tabs: DocumentTab[];
  /** Abas do cache cujo conteúdo veio do rascunho (mais novo que o cache). */
  adopted: string[];
  /** Abas que só existiam no rascunho — o cache as perdeu. */
  restored: string[];
  /** Rascunhos obsoletos (documento limpo quando foram escritos): remover do disco. */
  dropped: string[];
  /**
   * Rascunhos **mais velhos que o cache**: não entram no buffer, mas continuam no
   * disco. Não são lixo (são a cópia durável), são uma versão que o cache já
   * superou; o guardião os reescreve na próxima edição.
   */
  stale: string[];
  /** Rascunho mais recente, para a abertura mostrar o trabalho recuperado. */
  newest: string | null;
}

/**
 * Combina o cache de abas com os rascunhos duráveis.
 *
 * **A regra é dura e curta:** o rascunho **só** entra quando é de trabalho não
 * salvo (`dirty`). Rascunho de documento limpo é sobra de uma remoção que não
 * aconteceu, e adotá-lo traria de volta texto que o usuário já tinha salvo — ou
 * descartado. Rascunho sem aba correspondente vira aba: o cache pode ter sumido,
 * e o texto não.
 *
 * **E quem é mais novo vence.** O cache de abas guarda `cachedAt` (quando aquela
 * aba foi parar no `localStorage`); o rascunho guarda `savedAt` (quando foi
 * escrito). Os dois discordarem é normal — o cache é reescrito a cada mudança e
 * o rascunho tem debounce —, e adotar o mais velho devolveria o texto para trás,
 * apagando teclas que a pessoa já tinha visto na tela. Cache sem `cachedAt` (de
 * uma versão anterior) não bloqueia: aí o rascunho vence, porque ele é a cópia
 * durável.
 */
export function mergeDraftRecovery(
  cached: readonly DocumentTab[],
  drafts: readonly DocumentDraft[]
): DraftRecovery {
  const tabs = cached.map((tab) => ({ ...tab }));
  const adopted: string[] = [];
  const restored: string[] = [];
  const dropped: string[] = [];
  const stale: string[] = [];
  let newest: DocumentDraft | null = null;

  // Do mais antigo para o mais novo: se dois rascunhos disputassem a mesma aba
  // (não deveria acontecer — o id é a chave), o mais recente vence.
  const ordered = [...drafts].sort((a, b) => a.savedAt - b.savedAt);

  for (const draft of ordered) {
    if (!draft.dirty) {
      dropped.push(draft.documentId);
      continue;
    }

    const index = tabs.findIndex((tab) => tab.id === draft.documentId);
    if (index >= 0) {
      const tab = tabs[index];
      // Rascunho mais velho que o cache: o cache já tem o texto mais recente. O
      // rascunho fica no disco (é a rede), mas não volta para o buffer.
      if (tab.cachedAt !== undefined && draft.savedAt < tab.cachedAt) {
        stale.push(draft.documentId);
        continue;
      }
      if (tab.content === draft.content) {
        // Mesmo texto: não há o que recuperar. Se a aba está limpa, o rascunho é
        // sobra (a remoção depois do save não chegou ao disco); se está suja, ele
        // continua sendo a garantia do texto e não deve ser apagado.
        if (!tab.dirty) {
          dropped.push(draft.documentId);
          continue;
        }
        if (!newest || draft.savedAt >= newest.savedAt) newest = draft;
        continue;
      }
      tabs[index] = {
        ...tab,
        name: draft.name || tab.name,
        path: draft.path ?? tab.path,
        content: draft.content,
        dirty: true,
        // O rascunho é a versão mais recente do buffer; o selo de conflito
        // antigo não se aplica a ele. O próximo save volta a comparar o disco.
        deletedExternally: false,
        conflictedExternally: false,
      };
      adopted.push(draft.documentId);
    } else {
      tabs.push({
        id: draft.documentId,
        name: draft.name || "Untitled.md",
        path: draft.path,
        content: draft.content,
        dirty: true,
        origin: draft.origin ?? (draft.path ? "external" : "untitled"),
      });
      restored.push(draft.documentId);
    }

    if (!newest || draft.savedAt >= newest.savedAt) newest = draft;
  }

  return { tabs, adopted, restored, dropped, stale, newest: newest?.documentId ?? null };
}
