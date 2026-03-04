import { useCallback, useEffect, useMemo, useState } from "react";

interface UseSidebarResizeParams {
  initialWidth: number;
  minWidth?: number;
  maxWidth?: number;
  onResizeEnd?: (width: number) => void;
}

export function useSidebarResize({
  initialWidth,
  minWidth = 220,
  maxWidth = 520,
  onResizeEnd,
}: UseSidebarResizeParams) {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const clamp = useCallback(
    (value: number) => Math.min(maxWidth, Math.max(minWidth, value)),
    [maxWidth, minWidth]
  );

  useEffect(() => {
    setWidth(initialWidth);
  }, [initialWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (event: MouseEvent) => {
      const next = clamp(event.clientX);
      setWidth(next);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      onResizeEnd?.(width);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [clamp, isResizing, onResizeEnd, width]);

  const startResize = useCallback((event?: React.MouseEvent<HTMLDivElement>) => {
    event?.preventDefault();
    setIsResizing(true);
  }, []);

  const updateWidthWithKeyboard = useCallback(
    (next: number) => {
      const normalized = clamp(next);
      setWidth(normalized);
      onResizeEnd?.(normalized);
    },
    [clamp, onResizeEnd]
  );

  const handleWidth = isHandleHovered ? 16 : 12;
  const feedbackWidth = 6;

  const handleProps = useMemo(
    () => ({
      onMouseDown: startResize,
      onMouseEnter: () => setIsHandleHovered(true),
      onMouseLeave: () => setIsHandleHovered(false),
      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          updateWidthWithKeyboard(width - (event.shiftKey ? 24 : 12));
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          updateWidthWithKeyboard(width + (event.shiftKey ? 24 : 12));
          return;
        }
        if (event.key === "Home") {
          event.preventDefault();
          updateWidthWithKeyboard(minWidth);
          return;
        }
        if (event.key === "End") {
          event.preventDefault();
          updateWidthWithKeyboard(maxWidth);
        }
      },
      role: "separator" as const,
      "aria-orientation": "vertical" as const,
      "aria-label": "Resize sidebar",
      "aria-valuemin": minWidth,
      "aria-valuemax": maxWidth,
      "aria-valuenow": width,
      tabIndex: 0,
      style: {
        width: `${handleWidth}px`,
        cursor: "col-resize",
      },
    }),
    [handleWidth, maxWidth, minWidth, startResize, updateWidthWithKeyboard, width]
  );

  return {
    width,
    isResizing,
    handleWidth,
    feedbackWidth,
    handleProps,
  };
}
