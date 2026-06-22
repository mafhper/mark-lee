import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  createWrapSelectionTransaction,
  createLinePrefixTransaction,
  createReplaceAllTransaction,
  createInsertAtSelectionTransaction,
  createSelectAllTransaction,
} from "./editor-commands.ts";

function createState(doc: string, from = 0, to = 0): EditorState {
  return EditorState.create({
    doc,
    selection: to === from ? { anchor: from } : { anchor: from, head: to },
    extensions: [EditorView.lineWrapping],
  });
}

describe("createWrapSelectionTransaction", () => {
  it("envolve texto selecionado com before e after", () => {
    const state = createState("hello world", 0, 5);
    const spec = createWrapSelectionTransaction(state, "**", "**");
    assert.ok(spec.changes);
    const changes = spec.changes as { from: number; to: number; insert: string };
    assert.equal(changes.from, 0);
    assert.equal(changes.to, 5);
    assert.equal(changes.insert, "**hello**");
  });

  it("posiciona cursor entre marcadores quando seleção está vazia", () => {
    const state = createState("hello", 2, 2);
    const spec = createWrapSelectionTransaction(state, "**", "**");
    const changes = spec.changes as { from: number; to: number; insert: string };
    assert.equal(changes.insert, "****");
    const selection = spec.selection as { anchor: number };
    assert.equal(selection.anchor, 4); // 2 + before.length (2) = 4
  });

  it("funciona com documento vazio", () => {
    const state = createState("", 0, 0);
    const spec = createWrapSelectionTransaction(state, "*", "*");
    const changes = spec.changes as { from: number; to: number; insert: string };
    assert.equal(changes.insert, "**");
  });
});

describe("createLinePrefixTransaction", () => {
  it("insere prefixo no início da linha", () => {
    const state = createState("hello\nworld", 7, 7);
    const spec = createLinePrefixTransaction(state, "- ");
    const changes = spec.changes as { from: number; to: number; insert: string };
    assert.equal(changes.from, 6); // início da segunda linha
    assert.equal(changes.insert, "- ");
  });

  it("funciona na primeira linha", () => {
    const state = createState("hello", 0, 0);
    const spec = createLinePrefixTransaction(state, "1. ");
    const changes = spec.changes as { from: number; to: number; insert: string };
    assert.equal(changes.from, 0);
    assert.equal(changes.insert, "1. ");
  });
});

describe("createReplaceAllTransaction", () => {
  it("substitui todo o documento e posiciona cursor em 0", () => {
    const state = createState("old content", 5, 5);
    const spec = createReplaceAllTransaction(state, "new content");
    const changes = spec.changes as { from: number; to: number; insert: string };
    assert.equal(changes.from, 0);
    assert.equal(changes.to, 11);
    assert.equal(changes.insert, "new content");
    const selection = spec.selection as { anchor: number };
    assert.equal(selection.anchor, 0);
  });
});

describe("createInsertAtSelectionTransaction", () => {
  it("insere conteúdo na seleção, substituindo-a", () => {
    const state = createState("hello world", 0, 5);
    const spec = createInsertAtSelectionTransaction(state, "hi");
    const changes = spec.changes as { from: number; to: number; insert: string };
    assert.equal(changes.from, 0);
    assert.equal(changes.to, 5);
    assert.equal(changes.insert, "hi");
  });

  it("insere conteúdo na posição do cursor quando seleção vazia", () => {
    const state = createState("hello", 2, 2);
    const spec = createInsertAtSelectionTransaction(state, "X");
    const changes = spec.changes as { from: number; to: number; insert: string };
    assert.equal(changes.from, 2);
    assert.equal(changes.to, 2);
    assert.equal(changes.insert, "X");
  });
});

describe("createSelectAllTransaction", () => {
  it("seleciona todo o documento", () => {
    const state = createState("hello world", 0, 0);
    const spec = createSelectAllTransaction(state);
    const selection = spec.selection as { anchor: number; head: number };
    assert.equal(selection.anchor, 0);
    assert.equal(selection.head, 11);
  });
});
