import React from "react";
import { Bold, Italic, Code, Link as LinkIcon } from "lucide-react";
import { ThemeConfig } from "../../types";
import type { EditorView } from "@codemirror/view";
import { applyBold, applyItalic, applyInlineCode, applyLink } from "../../features/editor/editor-commands";
import type { SelectionToolbarPosition } from "../hooks/useEditorSelectionToolbar";

interface SelectionToolbarProps {
  visible: boolean;
  position: SelectionToolbarPosition | null;
  editorRef: React.MutableRefObject<EditorView | null>;
  isCodeDocument: boolean;
  t: Record<string, string>;
  tConfig: ThemeConfig;
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  visible,
  position,
  editorRef,
  isCodeDocument,
  t,
  tConfig,
}) => {
  if (!visible || !position || isCodeDocument) return null;

  const handleAction = (fn: (view: EditorView) => void) => {
    const view = editorRef.current;
    if (view) fn(view);
  };

  const buttons = [
    { icon: <Bold size={14} />, label: t["tool.bold"] || "Bold", action: () => handleAction(applyBold) },
    { icon: <Italic size={14} />, label: t["tool.italic"] || "Italic", action: () => handleAction(applyItalic) },
    { icon: <Code size={14} />, label: t["tool.code"] || "Code", action: () => handleAction(applyInlineCode) },
    { icon: <LinkIcon size={14} />, label: t["tool.link"] || "Link", action: () => handleAction(applyLink) },
  ];

  return (
    <div
      className={`fixed z-[250] inline-flex items-center gap-0.5 rounded-lg border shadow-xl px-1 py-0.5 ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg}`}
      style={{
        left: position.x,
        top: position.y,
        transform: position.above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
      }}
      onPointerDown={(event) => {
        event.preventDefault();
      }}
    >
      {buttons.map((btn, i) => (
        <button
          key={i}
          type="button"
          title={btn.label}
          aria-label={btn.label}
          className="inline-flex items-center justify-center h-7 w-7 rounded ml-btn"
          onPointerDown={(event) => {
            event.preventDefault();
          }}
          onClick={btn.action}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
};

export default SelectionToolbar;
