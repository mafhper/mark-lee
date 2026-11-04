import logoMark from "@/assets/logo-paper-mark.svg";

interface WordmarkProps {
  className?: string;
  withMark?: boolean;
}

const MARK_SIZE = 26;

/**
 * O SVG do simbolo carrega padding morto embaixo: o viewBox vai de 205,07 a
 * 1174,43 e a tinta do glifo termina em 974,97 — sobram 199,462 unidades de
 * 969,36, ou 20,58% da caixa. Alinhada na baseline, a caixa do arquivo deixa a
 * base pintada do M flutuando ~5px acima de `Mark-Lee`; o deslocamento desce a
 * caixa esse tanto, e a BASE PINTADA do glifo encosta na baseline do texto.
 *
 * E alinhamento optico, nao line-height: o valor sai das coordenadas do
 * desenho. `translateY` move so a pintura — `margin-bottom` negativo move a
 * caixa e o Chromium continua usando a borda inferior como baseline, o que
 * reproduz o desalinhamento em vez de corrigi-lo.
 */
const MARK_INK_BOTTOM_PADDING = (199.462 / 969.36) * MARK_SIZE;

/**
 * Marca do produto como tipografia: `Mark-Lee` e o ponto terracota.
 * O simbolo entra pela variante V1 (`logo-paper-mark.svg`), que e a que
 * sobrevive sobre `paper`.
 */
const Wordmark = ({ className = "", withMark = false }: WordmarkProps) => (
  <span className={`inline-flex items-baseline gap-3 ${className}`}>
    {withMark && (
      <img
        src={logoMark}
        alt=""
        className="shrink-0 self-baseline"
        style={{
          width: MARK_SIZE,
          height: MARK_SIZE,
          transform: `translateY(${MARK_INK_BOTTOM_PADDING}px)`,
        }}
      />
    )}
    <span>
      Mark-Lee
      <span aria-hidden="true" className="text-terracotta">
        .
      </span>
    </span>
  </span>
);

export default Wordmark;
