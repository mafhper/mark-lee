import { useEffect, useState } from "react";
import { Locale } from "@/i18n";
import { productVisual, ProductVisualKey } from "@/productVisuals";

interface ProductCoverflowProps {
  visuals: ProductVisualKey[];
  locale: Locale;
  intervalMs?: number;
}

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
};

const ProductCoverflow = ({ visuals, locale, intervalMs = 3800 }: ProductCoverflowProps) => {
  const slides = visuals.map((key) => productVisual(key, locale));
  const total = slides.length;
  const [active, setActive] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion || total <= 1) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % total);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [reducedMotion, total, intervalMs]);

  return (
    <div className="coverflow" role="group" aria-roledescription="carrossel" aria-label="Telas do Mark-Lee">
      <div className="coverflow__stage">
        {slides.map((visual, index) => {
          let offset = index - active;
          if (offset > total / 2) offset -= total;
          if (offset < -total / 2) offset += total;
          const distance = Math.abs(offset);
          const visible = distance <= 1;
          const isActive = offset === 0;

          return (
            <button
              key={visual.source}
              type="button"
              className="coverflow__item"
              data-active={isActive}
              aria-hidden={visible ? undefined : true}
              tabIndex={visible ? 0 : -1}
              aria-label={visual.localizedAlt}
              onClick={() => setActive(index)}
              style={{
                transform: `translate(-50%, -50%) translateX(${offset * 56}%) scale(${isActive ? 1 : 0.74})`,
                opacity: visible ? (isActive ? 1 : 0.5) : 0,
                zIndex: total - distance,
                pointerEvents: visible ? "auto" : "none",
              }}
            >
              <img
                src={visual.source}
                width={visual.width}
                height={visual.height}
                alt={visual.localizedAlt}
                loading="lazy"
                decoding="async"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProductCoverflow;
