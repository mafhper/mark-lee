import { EditorView } from "@codemirror/view";

export const activeEditorRef: { current: EditorView | null } = { current: null };

/** Assinantes de troca de editor. Ver `subscribeActiveEditor`. */
type EditorListener = (view: EditorView | null) => void;
const editorListeners = new Set<EditorListener>();

export function setActiveEditor(view: EditorView | null): void {
  activeEditorRef.current = view;
  for (const ouvinte of editorListeners) ouvinte(view);
}

/**
 * Assina a troca de editor ativo.
 *
 * Existe porque `activeEditorRef` é um objeto **comum**, fora do React: o
 * `.current` muda e nenhum componente re-renderiza por causa disso. O
 * `useSearchPanelOpen` dependia de `[viewRef]`, que nunca muda de identidade, e
 * ficava observando a primeira view para sempre — `aria-pressed` congelado em
 * `false` com o painel aberto na tela.
 *
 * Notificar é a correção honesta: quem depende da view corrente precisa saber
 * quando ela muda, e o ref sozinho não sabe dizer.
 */
export function subscribeActiveEditor(ouvinte: EditorListener): () => void {
  editorListeners.add(ouvinte);
  return () => {
    editorListeners.delete(ouvinte);
  };
}

/** Path of the current document (activeTab.path for editor, entry.path for journal) */
export const activeDocPathRef: { current: string } = { current: "" };
