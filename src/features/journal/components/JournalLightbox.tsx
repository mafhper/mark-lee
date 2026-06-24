import { useEffect, useCallback, useState } from "react";
import { X, ChevronLeft, ChevronRight, SlidersHorizontal, RotateCcw } from "lucide-react";
import { loadImage } from "../../../services/filesystem";

interface JournalLightboxProps {
  /** Filesystem path of the image; resolved to a WebView-displayable URL internally. */
  src: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  index?: number;
  total?: number;
  t?: Record<string, string>;
}

export function JournalLightbox({ src, onClose, onPrev, onNext, index, total, t }: JournalLightboxProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [saturation, setSaturation] = useState(100); // percent
  const [hue, setHue] = useState(0); // degrees
  const [showFilters, setShowFilters] = useState(false);

  // Resolve the filesystem path to a displayable URL, and reset non-destructive
  // viewing filters whenever the image changes.
  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);
    setSaturation(100);
    setHue(0);
    loadImage(src)
      .then((resolved) => { if (active) setUrl(resolved); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [src]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && onPrev) onPrev();
    if (e.key === "ArrowRight" && onNext) onNext();
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const filterStyle = `saturate(${saturation}%) hue-rotate(${hue}deg)`;
  const isAdjusted = saturation !== 100 || hue !== 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={onClose} role="dialog" aria-modal="true">
      {typeof index === "number" && typeof total === "number" && total > 1 && (
        <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-black/40 text-white/80 text-xs z-10">
          {index + 1} / {total}
        </div>
      )}

      <button type="button" onClick={(e) => { stop(e); setShowFilters((v) => !v); }}
        aria-pressed={showFilters}
        className="absolute top-4 right-14 h-8 w-8 rounded-full flex items-center justify-center bg-black/40 text-white/80 hover:bg-black/60 z-10"
        style={{ color: isAdjusted ? "#fbbf24" : undefined }}
        title={t?.["journal.imageFilters"] || "Adjust image"}>
        <SlidersHorizontal size={16} />
      </button>
      <button type="button" onClick={onClose}
        className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center bg-black/40 text-white/80 hover:bg-black/60 z-10">
        <X size={18} />
      </button>

      {onPrev && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 h-10 w-10 rounded-full flex items-center justify-center bg-black/40 text-white/80 hover:bg-black/60 z-10">
          <ChevronLeft size={22} />
        </button>
      )}
      {onNext && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 h-10 w-10 rounded-full flex items-center justify-center bg-black/40 text-white/80 hover:bg-black/60 z-10">
          <ChevronRight size={22} />
        </button>
      )}

      {url ? (
        <img src={url} alt="" style={{ filter: filterStyle }}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
          onClick={stop} />
      ) : (
        <div className="text-white/50 text-sm" onClick={stop}>
          {failed ? (t?.["journal.imageMissing"] || "Image unavailable") : "…"}
        </div>
      )}

      {showFilters && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-5 px-5 py-3 rounded-xl bg-black/60 text-white text-xs z-10"
          style={{ backdropFilter: "blur(8px)" }} onClick={stop}>
          <label className="flex items-center gap-2">
            <span className="opacity-80 w-16">{t?.["journal.saturation"] || "Saturation"}</span>
            <input type="range" min={0} max={300} value={saturation}
              onChange={(e) => setSaturation(Number(e.target.value))} className="accent-amber-400" />
          </label>
          <label className="flex items-center gap-2">
            <span className="opacity-80 w-12">{t?.["journal.hue"] || "Hue"}</span>
            <input type="range" min={0} max={360} value={hue}
              onChange={(e) => setHue(Number(e.target.value))} className="accent-amber-400" />
          </label>
          <button type="button" onClick={() => { setSaturation(100); setHue(0); }}
            disabled={!isAdjusted}
            className="h-7 w-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 disabled:opacity-30"
            title={t?.["journal.reset"] || "Reset"}>
            <RotateCcw size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
