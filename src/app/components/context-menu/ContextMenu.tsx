import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ThemeConfig } from "../../../types";
import type { ContextMenuAnchor, ContextMenuCloseReason, ContextMenuEntry } from "./types";
import {
  CLAMP_MARGIN,
  clampMenuPosition,
  resolveAnchorPoint,
  type MenuSize,
  type ViewportSize,
} from "./positionContextMenu";

interface ContextMenuProps {
  open: boolean;
  anchor: ContextMenuAnchor | null;
  items: ContextMenuEntry[];
  sourceElement: HTMLElement | null;
  tConfig: ThemeConfig;
  onClose: (reason: ContextMenuCloseReason) => void;
  onExecute: (entry: ContextMenuEntry) => Promise<void>;
}

function isItem(entry: ContextMenuEntry): entry is Extract<ContextMenuEntry, { type: "item" }> {
  return entry.type === "item";
}

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, a, input, textarea, select, [contenteditable='true']"));
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  open,
  anchor,
  items,
  sourceElement,
  tConfig,
  onClose,
  onExecute,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const flatItems = items.filter(isItem);

  const getViewport = useCallback((): ViewportSize => {
    return { width: window.innerWidth, height: window.innerHeight };
  }, []);

  const measureMenu = useCallback((): MenuSize => {
    const node = menuRef.current;
    if (!node) return { width: 200, height: 0 };
    const rect = node.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchor) {
      setVisible(false);
      setPosition(null);
      setActiveIndex(-1);
      return;
    }

    const requested = resolveAnchorPoint(anchor);
    const menu = measureMenu();
    const clamped = clampMenuPosition(requested, menu, getViewport(), CLAMP_MARGIN);
    setPosition(clamped);
    setVisible(true);

    const startIndex = flatItems.findIndex((item) => !item.disabled);
    setActiveIndex(startIndex);
    requestAnimationFrame(() => {
      if (startIndex >= 0) {
        itemRefs.current[startIndex]?.focus();
      }
    });
  }, [open, anchor, items, flatItems.length, getViewport, measureMenu]);

  useEffect(() => {
    if (!open) return;

    const handleResize = () => onClose("resize");
    const handleScroll = () => onClose("scroll");

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !visible) return;

    const handlePointerDown = (event: MouseEvent) => {
      const menu = menuRef.current;
      if (menu && menu.contains(event.target as Node)) return;
      if (!isInteractive(event.target)) {
        onClose("outside-pointer");
        return;
      }
      onClose("outside-pointer");
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open, visible, onClose]);

  const restoreFocus = useCallback(
    (reason: ContextMenuCloseReason) => {
      if (reason !== "escape") return;
      const element = sourceElement;
      if (element && typeof element.isConnected === "boolean" && element.isConnected) {
        try {
          element.focus();
        } catch {
          // ignore
        }
      }
    },
    [sourceElement]
  );

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose("escape");
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        return;
      }

      const lastIndex = flatItems.length - 1;
      if (lastIndex < 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => {
          let next = current;
          for (let i = 0; i <= lastIndex; i += 1) {
            next = next + 1 > lastIndex ? 0 : next + 1;
            if (!flatItems[next]?.disabled) return next;
          }
          return current;
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => {
          let next = current;
          for (let i = 0; i <= lastIndex; i += 1) {
            next = next - 1 < 0 ? lastIndex : next - 1;
            if (!flatItems[next]?.disabled) return next;
          }
          return current;
        });
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        const idx = flatItems.findIndex((item) => !item.disabled);
        setActiveIndex(idx >= 0 ? idx : -1);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        for (let i = lastIndex; i >= 0; i -= 1) {
          if (!flatItems[i]?.disabled) {
            setActiveIndex(i);
            return;
          }
        }
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const entry = flatItems[activeIndex];
        if (entry && !entry.disabled) {
          void onExecute(entry);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, flatItems, activeIndex, onClose, onExecute]);

  useEffect(() => {
    if (!open) return;
    const index = activeIndex;
    if (index < 0) return;
    const node = itemRefs.current[index];
    if (node) {
      node.focus();
      node.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    return () => {
      restoreFocus("escape");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !anchor) return null;

  let flatIndex = -1;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      className={`fixed z-[300] min-w-[200px] max-w-[320px] rounded-lg border shadow-xl py-1 ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg}`}
      style={
        {
          left: position?.x ?? -9999,
          top: position?.y ?? -9999,
          visibility: visible ? "visible" : "hidden",
          "--ml-ui": tConfig.uiHex,
          "--ml-border": tConfig.uiBorderHex,
          "--ml-fg": tConfig.fgHex,
          "--ml-bg": tConfig.bgHex,
        } as React.CSSProperties
      }
    >
      {items.map((entry) => {
        if (entry.type === "separator") {
          return <div key={entry.id} className={`my-1 h-px ${tConfig.uiBorder}`} />;
        }

        flatIndex += 1;
        const itemIndex = flatIndex;
        const isActive = itemIndex === activeIndex;
        const disabled = entry.disabled;

        return (
          <button
            key={entry.id}
            ref={(el) => {
              itemRefs.current[itemIndex] = el;
            }}
            role="menuitem"
            type="button"
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
              disabled
                ? "opacity-40 cursor-not-allowed"
                : entry.danger
                ? "text-rose-500 hover:bg-rose-500/10"
                : "hover:bg-black/5 dark:hover:bg-white/10"
            } ${isActive && !disabled ? "bg-black/5 dark:bg-white/10" : ""}`}
            onMouseEnter={() => !disabled && setActiveIndex(itemIndex)}
            onClick={() => {
              if (disabled) return;
              void onExecute(entry);
            }}
          >
            {entry.icon ? <span className="shrink-0">{entry.icon}</span> : null}
            <span className="flex-1 truncate">{entry.label}</span>
            {entry.shortcut ? (
              <span className="shrink-0 text-[10px] opacity-60">{entry.shortcut}</span>
            ) : null}
          </button>
        );
      })}
    </div>,
    document.body
  );
};

export default ContextMenu;
export type { ContextMenuProps };
