import { useEffect, useState } from "react";
import { Locale } from "@/i18n";
import { productVisual, ProductVisualKey } from "@/productVisuals";

interface ProductCarouselProps {
  visuals: ProductVisualKey[];
  locale: Locale;
  className?: string;
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

const ProductCarousel = ({ visuals, locale, className = "", intervalMs = 5200 }: ProductCarouselProps) => {
  const slides = visuals.map((key) => productVisual(key, locale));
  const [index, setIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [reducedMotion, slides.length, intervalMs]);

  return (
    <figure className={`product-frame product-carousel ${className}`.trim()}>
      <div className="product-frame__viewport product-carousel__viewport">
        {slides.map((visual, slideIndex) => {
          const active = slideIndex === index;
          return (
            <img
              key={visual.source}
              className="product-carousel__slide"
              data-active={active}
              src={visual.source}
              width={visual.width}
              height={visual.height}
              alt={active ? visual.localizedAlt : ""}
              aria-hidden={active ? undefined : true}
              loading={slideIndex === 0 ? "eager" : "lazy"}
              decoding="async"
              style={{ objectPosition: visual.focalPoint }}
            />
          );
        })}
      </div>
    </figure>
  );
};

export default ProductCarousel;
