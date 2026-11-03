import logoMark from "@/assets/logo-paper-mark.svg";

interface WordmarkProps {
  className?: string;
  withMark?: boolean;
}

/**
 * Marca do produto como tipografia: `Mark-Lee` e o ponto terracota.
 * O simbolo entra pela variante V1 (`logo-paper-mark.svg`), que e a que
 * sobrevive sobre `paper`.
 */
const Wordmark = ({ className = "", withMark = false }: WordmarkProps) => (
  <span className={`inline-flex items-baseline gap-3 ${className}`}>
    {withMark && <img src={logoMark} alt="" className="h-[26px] w-[26px] self-center" />}
    <span>
      Mark-Lee
      <span aria-hidden="true" className="text-terracotta">
        .
      </span>
    </span>
  </span>
);

export default Wordmark;
