import type { ContextMenuAnchor } from "./types";

export interface ViewportSize {
  width: number;
  height: number;
}

export interface MenuSize {
  width: number;
  height: number;
}

export interface ResolvedAnchor {
  x: number;
  y: number;
}

export const CLAMP_MARGIN = 8;

export function resolveAnchorPoint(anchor: ContextMenuAnchor): ResolvedAnchor {
  if (anchor.type === "point") {
    return { x: anchor.x, y: anchor.y };
  }
  const rect = anchor.element.getBoundingClientRect();
  return { x: rect.left, y: rect.bottom };
}

export function clampMenuPosition(
  requested: ResolvedAnchor,
  menu: MenuSize,
  viewport: ViewportSize,
  margin: number = CLAMP_MARGIN
): ResolvedAnchor {
  const maxWidth = Math.max(0, viewport.width - 2 * margin);
  const maxHeight = Math.max(0, viewport.height - 2 * margin);

  const effectiveMenuWidth = Math.min(menu.width, maxWidth);
  const effectiveMenuHeight = Math.min(menu.height, maxHeight);

  const x = Math.max(
    margin,
    Math.min(requested.x, viewport.width - effectiveMenuWidth - margin)
  );
  const y = Math.max(
    margin,
    Math.min(requested.y, viewport.height - effectiveMenuHeight - margin)
  );

  return { x, y };
}
