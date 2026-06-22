import { useEffect, type RefObject } from "react";
import { useContextMenu } from "./ContextMenuProvider";
import type { ContextMenuAnchor, ContextMenuEntry } from "./types";

export interface UseContextMenuTriggerOptions<T extends HTMLElement> {
  ref: RefObject<T | null>;
  resolveItems: (anchor: ContextMenuAnchor) => ContextMenuEntry[];
  resolveKeyboardAnchor?: (element: HTMLElement) => ContextMenuAnchor;
  resolvePointerAnchor?: (event: React.MouseEvent) => ContextMenuAnchor;
}

function isContextMenuKey(event: KeyboardEvent): boolean {
  if (event.shiftKey && event.key === "F10") return true;
  if (event.key === "ContextMenu") return true;
  // Fallback para WebViews problemáticas que ainda emitem keyCode 93.
  if ((event as KeyboardEvent & { keyCode?: number }).keyCode === 93) return true;
  return false;
}

export function useContextMenuTrigger<T extends HTMLElement>({
  ref,
  resolveItems,
  resolveKeyboardAnchor,
  resolvePointerAnchor,
}: UseContextMenuTriggerOptions<T>) {
  const { openContextMenu } = useContextMenu();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isContextMenuKey(event)) return;
      event.preventDefault();
      const anchor: ContextMenuAnchor = resolveKeyboardAnchor
        ? resolveKeyboardAnchor(element)
        : { type: "element", element };
      openContextMenu({
        anchor,
        items: resolveItems(anchor),
        sourceElement: element,
      });
    };

    element.addEventListener("keydown", handleKeyDown);
    return () => {
      element.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, resolveItems, resolveKeyboardAnchor, openContextMenu]);

  const onContextMenu = (event: React.MouseEvent<T>) => {
    const anchor: ContextMenuAnchor = resolvePointerAnchor
      ? resolvePointerAnchor(event)
      : { type: "point", x: event.clientX, y: event.clientY };
    event.preventDefault();
    event.stopPropagation();
    openContextMenu({
      anchor,
      items: resolveItems(anchor),
      sourceElement: event.currentTarget,
    });
  };

  return { onContextMenu };
}
