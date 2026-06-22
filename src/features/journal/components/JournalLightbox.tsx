import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface JournalLightboxProps {
  src: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function JournalLightbox({ src, onClose, onPrev, onNext }: JournalLightboxProps) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && onPrev) onPrev();
    if (e.key === "ArrowRight" && onNext) onNext();
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={onClose} role="dialog" aria-modal="true">
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
      <img src={src} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
