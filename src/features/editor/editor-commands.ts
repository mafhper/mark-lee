import { undo, redo } from "@codemirror/commands";
import { EditorSelection, type EditorState, type TransactionSpec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export function createWrapSelectionTransaction(
  state: EditorState,
  before: string,
  after: string
): TransactionSpec {
  const selection = state.selection.main;
  const selected = state.doc.sliceString(selection.from, selection.to);
  const next = `${before}${selected}${after}`;
  return {
    changes: { from: selection.from, to: selection.to, insert: next },
    selection: EditorSelection.cursor(selection.from + before.length + selected.length),
  };
}

export function createLinePrefixTransaction(
  state: EditorState,
  prefix: string
): TransactionSpec {
  const selection = state.selection.main;
  const line = state.doc.lineAt(selection.from);
  return {
    changes: { from: line.from, to: line.from, insert: prefix },
    selection: EditorSelection.cursor(selection.from + prefix.length),
  };
}

export function createReplaceAllTransaction(
  state: EditorState,
  content: string
): TransactionSpec {
  return {
    changes: { from: 0, to: state.doc.length, insert: content },
    selection: EditorSelection.cursor(0),
  };
}

export function createInsertAtSelectionTransaction(
  state: EditorState,
  content: string
): TransactionSpec {
  const selection = state.selection.main;
  return {
    changes: { from: selection.from, to: selection.to, insert: content },
  };
}

export function createSelectAllTransaction(state: EditorState): TransactionSpec {
  return {
    selection: EditorSelection.range(0, state.doc.length),
    effects: EditorView.scrollIntoView(0, { y: "start" }),
  };
}

export function applyWrapSelection(view: EditorView, before: string, after?: string): void {
  view.dispatch(createWrapSelectionTransaction(view.state, before, after ?? before));
  view.focus();
}

export function applyBold(view: EditorView): void {
  applyWrapSelection(view, "**", "**");
}

export function applyItalic(view: EditorView): void {
  applyWrapSelection(view, "*", "*");
}

export function applyInlineCode(view: EditorView): void {
  applyWrapSelection(view, "`", "`");
}

export function applyLink(view: EditorView): void {
  applyWrapSelection(view, "[", "](https://example.com)");
}

export function applyLinePrefix(view: EditorView, prefix: string): void {
  view.dispatch(createLinePrefixTransaction(view.state, prefix));
  view.focus();
}

export function insertSnippetContent(view: EditorView, content: string): void {
  view.dispatch(createInsertAtSelectionTransaction(view.state, content));
  view.focus();
}

export function selectAllEditorContent(view: EditorView): boolean {
  view.dispatch(createSelectAllTransaction(view.state));
  view.focus();
  return true;
}

export function undoEditor(view: EditorView): void {
  undo(view);
  view.focus();
}

export function redoEditor(view: EditorView): void {
  redo(view);
  view.focus();
}

export function insertTable(view: EditorView, rows = 3, cols = 3): void {
  const header = "| " + Array.from({ length: cols }, (_, i) => ` Header ${i + 1} `).join("| ") + " |";
  const sep = "| " + Array.from({ length: cols }, () => "---").join("|") + " |";
  const data = Array.from({ length: rows - 1 }, () =>
    "| " + Array.from({ length: cols }, (_, i) => ` Cell ${i + 1} `).join("| ") + " |"
  ).join("\n");
  const table = `\n${header}\n${sep}\n${data}\n`;
  view.dispatch(createInsertAtSelectionTransaction(view.state, table));
  view.focus();
}

export function transformMarkdown(view: EditorView, content: string): void {
  view.dispatch(createReplaceAllTransaction(view.state, content));
  view.focus();
}
