import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw, Settings, X, GripHorizontal } from "lucide-react";
import type { ThemeConfig } from "../types";

interface PomodoroTimerProps {
  tConfig: ThemeConfig;
  activated: boolean;
  onActivate: (a: boolean) => void;
}

const DEFAULT_WORK = 25 * 60;
const DEFAULT_BREAK = 5 * 60;

type Phase = "work" | "break";
type ViewMode = "hidden" | "popover" | "compact";

export function PomodoroTimer({ tConfig, activated, onActivate }: PomodoroTimerProps) {
  const [phase, setPhase] = useState<Phase>("work");
  const [remaining, setRemaining] = useState(DEFAULT_WORK);
  const [running, setRunning] = useState(false);
  const [workTime, setWorkTime] = useState(DEFAULT_WORK);
  const [breakTime, setBreakTime] = useState(DEFAULT_BREAK);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("hidden");
  const [pos, setPos] = useState({ x: -999, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setRemaining((r) => {
        if (r <= 1) { clearTimer(); return 0; }
        return r - 1;
      }), 1000);
    } else clearTimer();
    return clearTimer;
  }, [running, clearTimer]);

  const beep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = "sine"; gain.gain.value = 0.3;
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, []);

  const handleComplete = useCallback(() => {
    clearTimer(); setRunning(false);
    if (phase === "work") { setPhase("break"); setRemaining(breakTime); }
    else { setPhase("work"); setRemaining(workTime); }
    beep();
  }, [phase, breakTime, workTime, clearTimer, beep]);

  useEffect(() => { if (remaining === 0 && !running) handleComplete(); }, [remaining]);

  useEffect(() => {
    if (activated && viewMode === "hidden") setViewMode("popover");
    if (!activated) { clearTimer(); setRunning(false); setViewMode("hidden"); }
  }, [activated]);

  const toggleRunning = () => {
    if (remaining === 0) { setPhase("work"); setRemaining(workTime); setRunning(true); }
    else setRunning((r) => !r);
  };

  const reset = () => { clearTimer(); setRunning(false); setPhase("work"); setRemaining(workTime); };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const progress = phase === "work" ? (workTime - remaining) / workTime : (breakTime - remaining) / breakTime;

  const handlePointerDown = (e: React.PointerEvent, currentPos: { x: number; y: number }) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: currentPos.x, origY: currentPos.y };
    const handleMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      setPos({ x: dragRef.current.origX + ev.clientX - dragRef.current.startX, y: dragRef.current.origY + ev.clientY - dragRef.current.startY });
    };
    const handleUp = () => { dragRef.current = null; document.removeEventListener("pointermove", handleMove); document.removeEventListener("pointerup", handleUp); };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  };

  const showCompact = running && viewMode !== "compact";

  return (
    <>
      {viewMode === "popover" && (
        <div className="fixed z-[9999] rounded-lg shadow-2xl border p-3"
          style={{
            left: pos.x < -900 ? "auto" : `${pos.x}px`,
            right: pos.x < -900 ? "16px" : "auto",
            top: pos.y ? `${pos.y}px` : "64px",
            width: "180px",
            backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex,
          }}>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onPointerDown={(e) => handlePointerDown(e, pos.x < -900 ? { x: window.innerWidth - 200, y: 64 } : pos)}
              className="cursor-grab active:cursor-grabbing hover:opacity-60" style={{ color: tConfig.fgHex + "40" }}>
              <GripHorizontal size={11} />
            </button>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: phase === "work" ? tConfig.accentHex + "99" : "#3b82f699" }}>
              {phase === "work" ? "Focus" : "Break"}
            </span>
            <button type="button" onClick={() => { onActivate(false); setViewMode("hidden"); }}
              className="hover:opacity-60" style={{ color: tConfig.fgHex + "40" }}>
              <X size={11} />
            </button>
          </div>

          {showSettings ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span>Focus (min)</span>
                <input type="number" min={1} max={120} value={workTime / 60}
                  onChange={(e) => { const v = Math.max(1, Number(e.target.value)); setWorkTime(v * 60); if (!running) setRemaining(v * 60); }}
                  className="w-12 px-1 py-0.5 rounded text-center text-[10px] border"
                  style={{ backgroundColor: tConfig.editorBgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }} />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span>Break (min)</span>
                <input type="number" min={1} max={60} value={breakTime / 60}
                  onChange={(e) => { const v = Math.max(1, Number(e.target.value)); setBreakTime(v * 60); }}
                  className="w-12 px-1 py-0.5 rounded text-center text-[10px] border"
                  style={{ backgroundColor: tConfig.editorBgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }} />
              </div>
            </div>
          ) : (
            <>
              <div className="text-center">
                <span className="text-2xl font-mono font-bold" style={{ color: phase === "work" ? tConfig.accentHex : "#3b82f6" }}>
                  {formatTime(remaining)}
                </span>
              </div>
              <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: tConfig.uiBorderHex }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${Math.min(progress * 100, 100)}%`,
                  backgroundColor: phase === "work" ? tConfig.accentHex : "#3b82f6",
                }} />
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <button type="button" onClick={toggleRunning}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>
                  {running ? <Pause size={12} /> : <Play size={12} />}
                </button>
                <button type="button" onClick={reset}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: tConfig.fgHex + "40" }}>
                  <RotateCcw size={11} />
                </button>
                <button type="button" onClick={() => setShowSettings(true)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: tConfig.fgHex + "40" }}>
                  <Settings size={10} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showCompact && (
        <div className="fixed z-[9999] flex items-center gap-2 px-2.5 py-1.5 rounded-full shadow-lg border text-xs font-mono transition-all cursor-pointer select-none"
          style={{
            left: "16px",
            bottom: "48px",
            backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex,
          }}
          onClick={() => setViewMode("popover")}
          title="Open Pomodoro">
          <span style={{ color: phase === "work" ? tConfig.accentHex : "#3b82f6" }}>
            <Timer size={11} />
          </span>
          <span className="font-medium" style={{ color: tConfig.fgHex }}>{formatTime(remaining)}</span>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: tConfig.fgHex + "40" }}>
            {phase === "work" ? "F" : "B"}
          </span>
        </div>
      )}
    </>
  );
}

export function PomodoroTrigger({ tConfig, activated, onActivate }: PomodoroTimerProps) {
  return (
    <button type="button" onClick={() => onActivate(!activated)}
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors"
      style={{
        color: activated ? tConfig.accentHex : tConfig.fgHex + "b3",
        backgroundColor: activated ? tConfig.accentHex + "12" : "transparent",
      }}
      title={activated ? "Close Pomodoro" : "Open Pomodoro"}>
      <Timer size={11} />
      {activated && <span>Pomodoro</span>}
    </button>
  );
}
