import { useCallback, useEffect, useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import { useContextMenu } from "../components/context-menu";

export interface SelectionToolbarPosition {
  x: number;
  y: number;
  above: boolean;
}

export function useEditorSelectionToolbar(
  view: EditorView | null,
  enabled: boolean
) {
  const { isContextMenuOpen } = useContextMenu();
  const [position, setPosition] = useState<SelectionToolbarPosition | null>(null);
  const visible = position !== null && !isContextMenuOpen;
  const lastPointerUpRef = useRef(0);

  const update = useCallback(() => {
    if (!view || !enabled) {
      setPosition(null);
      return;
    }

    const selection = view.state.selection.main;
    if (selection.empty) {
      setPosition(null);
      return;
    }

    if (!view.hasFocus) {
      setPosition(null);
      return;
    }

    view.requestMeasure({
      read: () => {
        try {
          const fromCoords = view.coordsAtPos(selection.from);
          const toCoords = view.coordsAtPos(selection.to);
          if (!fromCoords || !toCoords) {
            setPosition(null);
            return;
          }

          const centerX = (fromCoords.left + toCoords.right) / 2;
          const topY = Math.min(fromCoords.top, toCoords.top);
          const bottomY = Math.max(fromCoords.bottom, toCoords.bottom);
          const above = topY > 80;
          const y = above ? topY - 8 : bottomY + 8;

          setPosition({
            x: Math.max(8, Math.min(centerX, window.innerWidth - 8)),
            y,
            above,
          });
        } catch {
          setPosition(null);
        }
      },
    });
  }, [view, enabled]);

  useEffect(() => {
    if (!view) {
      setPosition(null);
      return;
    }

    const dom = view.dom;
    const onPointerUp = () => {
      lastPointerUpRef.current = performance.now();
      requestAnimationFrame(() => update());
    };
    const onScroll = () => setPosition(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPosition(null);
      } else if (event.shiftKey || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
        requestAnimationFrame(() => update());
      }
    };

    dom.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("scroll", onScroll, true);
    dom.addEventListener("keydown", onKeyDown);

    return () => {
      dom.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("scroll", onScroll, true);
      dom.removeEventListener("keydown", onKeyDown);
    };
  }, [view, update]);

  useEffect(() => {
    if (isContextMenuOpen) {
      setPosition(null);
    }
  }, [isContextMenuOpen]);

  return { position, visible };
}
