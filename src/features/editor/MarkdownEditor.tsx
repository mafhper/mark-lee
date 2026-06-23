import { useRef, useEffect, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { lineNumbers } from "@codemirror/view";
import { setActiveEditor } from "./active-editor";
import type { ThemeConfig } from "../../types";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  tConfig: ThemeConfig;
  onCreateEditor?: (view: EditorView) => void;
  placeholder?: string;
  height?: string;
  className?: string;
}

function hexLuminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function MarkdownEditor({ value, onChange, tConfig, onCreateEditor, placeholder, height, className }: MarkdownEditorProps) {
  const viewRef = useRef<EditorView | null>(null);

  const extensions = useMemo(() => [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    lineNumbers(),
    EditorState.allowMultipleSelections.of(false),
    EditorView.lineWrapping,
    markdown(),
  ], []);

  useEffect(() => {
    return () => {
      if (viewRef.current) {
        setActiveEditor(null);
        viewRef.current = null;
      }
    };
  }, []);

  return (
    <CodeMirror
      value={value}
      height={height ?? "100%"}
      className={className ?? "h-full"}
      extensions={extensions}
      onChange={onChange}
      basicSetup={{
        foldGutter: true,
        highlightActiveLine: true,
      }}
      theme={hexLuminance(tConfig.editorBgHex) > 0.33 ? "light" : "dark"}
      onCreateEditor={(view) => {
        viewRef.current = view;
        setActiveEditor(view);
        view.dom.addEventListener("focus", () => setActiveEditor(view));
        onCreateEditor?.(view);
      }}
      placeholder={placeholder}
    />
  );
}
