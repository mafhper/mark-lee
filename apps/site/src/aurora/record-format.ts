import { Locale } from "@/i18n";

/**
 * Datas de um registro no idioma da pagina.
 *
 * A data do registro e um dia, nao um instante: `2026-11-02` e lido como o dia
 * 2 local, nunca como meia-noite UTC — senao o fuso do visitante muda o dia
 * que o palco mostra.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, formatter);
  }
  return formatter;
};

const parseRecordDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const formatRecordDate = (locale: Locale, isoDate: string, style: "short" | "long" = "short"): string =>
  formatterFor(locale, {
    day: "2-digit",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  }).format(parseRecordDate(isoDate));

export const formatRecordMonth = (locale: Locale, isoDate: string): string =>
  formatterFor(locale, { month: "long", year: "numeric" }).format(parseRecordDate(isoDate));

export const formatRecordDay = (locale: Locale, isoDate: string): string =>
  formatterFor(locale, { day: "2-digit" }).format(parseRecordDate(isoDate));
