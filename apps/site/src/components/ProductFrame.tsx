import { Locale } from "@/i18n";
import { productVisual, ProductVisualKey } from "@/productVisuals";

interface ProductFrameProps {
  visual: ProductVisualKey;
  locale: Locale;
  eager?: boolean;
  label?: string;
  className?: string;
}

const ProductFrame = ({ visual: key, locale, eager = false, label, className = "" }: ProductFrameProps) => {
  const visual = productVisual(key, locale);

  return (
    <figure className={`product-frame ${className}`.trim()}>
      {label && <div className="product-frame__label">{label}</div>}
      <div className="product-frame__viewport">
        <img
          src={visual.source}
          width={visual.width}
          height={visual.height}
          alt={visual.localizedAlt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          style={{ objectPosition: visual.focalPoint }}
        />
      </div>
      <figcaption>
        Mark-Lee {visual.appVersion} <span aria-hidden="true">·</span> {visual.capturedAt}
      </figcaption>
    </figure>
  );
};

export default ProductFrame;
