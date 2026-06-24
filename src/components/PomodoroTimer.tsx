import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw, Settings, X, GripHorizontal, Check, Coffee, Lock } from "lucide-react";
import type { ThemeConfig } from "../types";

interface PomodoroTimerProps {
  tConfig: ThemeConfig;
  activated: boolean;
  onActivate: (a: boolean) => void;
  /** Fired when the read-only break lock turns on/off (lock mode + on break + running). */
  onLockedChange?: (locked: boolean) => void;
  t?: Record<string, string>;
}

const PREFS_KEY = "mark-lee-pomodoro";

type Phase = "work" | "break";
type ViewMode = "hidden" | "popover" | "compact";

interface PomodoroPrefs {
  workMin?: number;
  breakMin?: number;
  sound?: boolean;
  animation?: boolean;
  autoBreak?: boolean;
  lockMode?: boolean;
}

function loadPrefs(): PomodoroPrefs {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as PomodoroPrefs; } catch { return {}; }
}

function Toggle({ label, on, onChange, tConfig }: { label: string; on: boolean; onChange: (v: boolean) => void; tConfig: ThemeConfig }) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      className="w-full flex items-center justify-between text-[10px] py-0.5" style={{ color: tConfig.fgHex + "C0" }}>
      <span>{label}</span>
      <span className="relative inline-flex h-3.5 w-6 rounded-full transition-colors" style={{ backgroundColor: on ? tConfig.accentHex : tConfig.uiBorderHex }}>
        <span className="absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all" style={{ left: on ? "12px" : "2px" }} />
      </span>
    </button>
  );
}

export function PomodoroTimer({ tConfig, activated, onActivate, onLockedChange, t }: PomodoroTimerProps) {
  const prefs0 = loadPrefs();
  const [phase, setPhase] = useState<Phase>("work");
  const [workTime, setWorkTime] = useState((prefs0.workMin ?? 25) * 60);
  const [breakTime, setBreakTime] = useState((prefs0.breakMin ?? 5) * 60);
  const [remaining, setRemaining] = useState((prefs0.workMin ?? 25) * 60);
  const [running, setRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("hidden");
  const [workCount, setWorkCount] = useState(0);
  const [breakCount, setBreakCount] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);
  const [sound, setSound] = useState(prefs0.sound ?? true);
  const [animation, setAnimation] = useState(prefs0.animation ?? true);
  const [autoBreak, setAutoBreak] = useState(prefs0.autoBreak ?? true);
  const [lockMode, setLockMode] = useState(prefs0.lockMode ?? false);
  const [pos, setPos] = useState({ x: -999, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tr = (k: string, fallback: string) => t?.[k] || fallback;

  // Persist preferences.
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        workMin: Math.round(workTime / 60), breakMin: Math.round(breakTime / 60), sound, animation, autoBreak, lockMode,
      } satisfies PomodoroPrefs));
    } catch { /* ignore */ }
  }, [workTime, breakTime, sound, animation, autoBreak, lockMode]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
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
    } catch { /* ignore */ }
  }, []);

  // Phase ended: optional beep + shake, count the completed cycle, and (if enabled)
  // auto-start the next phase so the break/next focus begins counting on its own.
  useEffect(() => {
    if (remaining !== 0 || !running) return;
    if (sound) beep();
    if (animation) setJustCompleted(true);
    if (phase === "work") {
      setWorkCount((c) => c + 1);
      setPhase("break"); setRemaining(breakTime);
    } else {
      setBreakCount((c) => c + 1);
      setPhase("work"); setRemaining(workTime);
    }
    setRunning(autoBreak);
  }, [remaining, running, phase, breakTime, workTime, beep, sound, animation, autoBreak]);

  useEffect(() => {
    if (!justCompleted) return;
    const id = setTimeout(() => setJustCompleted(false), 1200);
    return () => clearTimeout(id);
  }, [justCompleted]);

  useEffect(() => {
    if (activated && viewMode === "hidden") setViewMode("popover");
    if (!activated) {
      clearTimer(); setRunning(false); setViewMode("hidden");
      setWorkCount(0); setBreakCount(0); setPhase("work"); setRemaining(workTime);
    }
  }, [activated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify the app when the read-only break lock is active.
  const locked = lockMode && phase === "break" && running;
  useEffect(() => { onLockedChange?.(locked); }, [locked, onLockedChange]);
  useEffect(() => () => onLockedChange?.(false), [onLockedChange]);

  const toggleRunning = () => {
    if (remaining === 0) { setPhase("work"); setRemaining(workTime); setRunning(true); }
    else setRunning((r) => !r);
  };

  const reset = () => { clearTimer(); setRunning(false); setPhase("work"); setRemaining(workTime); };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const progress = phase === "work" ? (workTime - remaining) / workTime : (breakTime - remaining) / breakTime;
  const phaseColor = phase === "work" ? tConfig.accentHex : "#3b82f6";

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
        <div className={`fixed z-[9999] rounded-lg shadow-2xl border p-3 ${justCompleted ? "ml-pomodoro-shake" : ""}`}
          style={{
            left: pos.x < -900 ? "auto" : `${pos.x}px`,
            right: pos.x < -900 ? "16px" : "auto",
            top: pos.y ? `${pos.y}px` : "64px",
            width: "186px",
            backgroundColor: tConfig.bgHex, borderColor: locked ? phaseColor + "88" : tConfig.uiBorderHex, color: tConfig.fgHex,
          }}>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onPointerDown={(e) => handlePointerDown(e, pos.x < -900 ? { x: window.innerWidth - 200, y: 64 } : pos)}
              className="cursor-grab active:cursor-grabbing hover:opacity-60" style={{ color: tConfig.fgHex + "40" }}>
              <GripHorizontal size={11} />
            </button>
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: phaseColor + "CC" }}>
              {locked && <Lock size={9} />}
              {phase === "work" ? tr("pomodoro.focus", "Focus") : tr("pomodoro.break", "Break")}
            </span>
            <button type="button" onClick={() => { onActivate(false); setViewMode("hidden"); }}
              className="hover:opacity-60" style={{ color: tConfig.fgHex + "40" }}>
              <X size={11} />
            </button>
          </div>

          {showSettings ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span>{tr("pomodoro.focusMin", "Focus (min)")}</span>
                <input type="number" min={1} max={120} value={workTime / 60}
                  onChange={(e) => { const v = Math.max(1, Number(e.target.value)); setWorkTime(v * 60); if (!running) setRemaining(v * 60); }}
                  className="w-12 px-1 py-0.5 rounded text-center text-[10px] border"
                  style={{ backgroundColor: tConfig.editorBgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }} />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span>{tr("pomodoro.breakMin", "Break (min)")}</span>
                <input type="number" min={1} max={60} value={breakTime / 60}
                  onChange={(e) => { const v = Math.max(1, Number(e.target.value)); setBreakTime(v * 60); }}
                  className="w-12 px-1 py-0.5 rounded text-center text-[10px] border"
                  style={{ backgroundColor: tConfig.editorBgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }} />
              </div>
              <div className="border-t my-1 pt-1 space-y-0.5" style={{ borderColor: tConfig.uiBorderHex }}>
                <Toggle label={tr("pomodoro.sound", "Sound")} on={sound} onChange={setSound} tConfig={tConfig} />
                <Toggle label={tr("pomodoro.animation", "End animation")} on={animation} onChange={setAnimation} tConfig={tConfig} />
                <Toggle label={tr("pomodoro.autoBreak", "Auto-start break")} on={autoBreak} onChange={setAutoBreak} tConfig={tConfig} />
                <Toggle label={tr("pomodoro.lock", "Lock during break")} on={lockMode} onChange={setLockMode} tConfig={tConfig} />
              </div>
              <button type="button" onClick={() => setShowSettings(false)}
                className="w-full mt-1 h-7 rounded flex items-center justify-center gap-1.5 text-[11px] font-medium transition-colors"
                style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>
                <Check size={12} /> OK
              </button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <span className="text-2xl font-mono font-bold" style={{ color: phaseColor }}>
                  {formatTime(remaining)}
                </span>
              </div>
              <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: tConfig.uiBorderHex }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(progress * 100, 100)}%`, backgroundColor: phaseColor }} />
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
                <button type="button" onClick={() => setShowSettings((s) => !s)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: tConfig.fgHex + "40" }} title={tr("pomodoro.settings", "Settings")}>
                  <Settings size={10} />
                </button>
              </div>
              <div className="flex items-center justify-center gap-3 mt-2 text-[10px]" style={{ color: tConfig.fgHex + "55" }}>
                <span className="flex items-center gap-1" title={tr("pomodoro.focus", "Focus")}><Timer size={10} /> {workCount}</span>
                <span className="flex items-center gap-1" title={tr("pomodoro.break", "Break")}><Coffee size={10} /> {breakCount}</span>
              </div>
            </>
          )}
        </div>
      )}

      {showCompact && (
        <div className={`fixed z-[9999] flex items-center gap-2 px-2.5 py-1.5 rounded-full shadow-lg border text-xs font-mono transition-all cursor-pointer select-none ${justCompleted ? "ml-pomodoro-shake" : ""}`}
          style={{
            left: "16px",
            bottom: "48px",
            backgroundColor: tConfig.bgHex, borderColor: locked ? phaseColor + "88" : tConfig.uiBorderHex, color: tConfig.fgHex,
          }}
          onClick={() => setViewMode("popover")}
          title={tr("pomodoro.open", "Open Pomodoro")}>
          <span style={{ color: phaseColor }}>{locked ? <Lock size={11} /> : <Timer size={11} />}</span>
          <span className="font-medium" style={{ color: tConfig.fgHex }}>{formatTime(remaining)}</span>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: tConfig.fgHex + "40" }}>
            {phase === "work" ? "F" : "B"} · {workCount}
          </span>
        </div>
      )}
    </>
  );
}

export function PomodoroTrigger({ tConfig, activated, onActivate, t }: PomodoroTimerProps) {
  return (
    <button type="button" onClick={() => onActivate(!activated)}
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors"
      style={{
        color: activated ? tConfig.accentHex : tConfig.fgHex + "b3",
        backgroundColor: activated ? tConfig.accentHex + "12" : "transparent",
      }}
      title={activated ? (t?.["pomodoro.close"] || "Close Pomodoro") : (t?.["pomodoro.open"] || "Open Pomodoro")}>
      <Timer size={11} />
      {activated && <span>Pomodoro</span>}
    </button>
  );
}
