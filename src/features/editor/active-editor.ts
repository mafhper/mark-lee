import { EditorView } from "@codemirror/view";

export const activeEditorRef: { current: EditorView | null } = { current: null };

export function setActiveEditor(view: EditorView | null): void {
  activeEditorRef.current = view;
}

/** Path of the current document (activeTab.path for editor, entry.path for journal) */
export const activeDocPathRef: { current: string } = { current: "" };
