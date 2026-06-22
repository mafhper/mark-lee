import type { ReactNode } from "react";

export type ContextMenuEntry =
  | {
      type: "item";
      id: string;
      label: string;
      icon?: ReactNode;
      shortcut?: string;
      disabled?: boolean;
      danger?: boolean;
      onSelect: () => void | Promise<void>;
    }
  | { type: "separator"; id: string };

export type ContextMenuAnchor =
  | { type: "point"; x: number; y: number }
  | { type: "element"; element: HTMLElement };

export type ContextMenuCloseReason =
  | "escape"
  | "select"
  | "outside-pointer"
  | "resize"
  | "scroll"
  | "replaced";

export interface OpenContextMenuOptions {
  anchor: ContextMenuAnchor;
  items: ContextMenuEntry[];
  sourceElement?: HTMLElement | null;
}

export interface ContextMenuState {
  anchor: ContextMenuAnchor;
  items: ContextMenuEntry[];
  sourceElement: HTMLElement | null;
}
