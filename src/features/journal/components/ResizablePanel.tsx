import { useRef, useCallback, useEffect, useState } from "react";
import type { ThemeConfig } from "../../../types";

interface ResizablePanelProps {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  theme: ThemeConfig;
  children: React.ReactNode;
  onWidthChange?: (width: number) => void;
}

export function ResizablePanel({ initialWidth, minWidth, maxWidth, theme, children, onWidthChange }: ResizablePanelProps) {
  const [width, setWidth] = useState(initialWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + delta));
      setWidth(newWidth);
      onWidthChange?.(newWidth);
    };
    const handleMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minWidth, maxWidth, onWidthChange]);

  return (
    <div className="relative h-full shrink-0" style={{ width }}>
      {children}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-10 transition-colors hover:opacity-100"
        style={{ opacity: 0.3, backgroundColor: theme.uiBorderHex }}
      />
    </div>
  );
}
