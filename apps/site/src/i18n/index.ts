import { enUSCopy } from "@/i18n/copy.en";
import { esESCopy } from "@/i18n/copy.es";
import { ptBRCopy } from "@/i18n/copy.pt";
import { Locale, SiteCopy } from "@/i18n/types";

const SITE_COPY: Record<Locale, SiteCopy> = {
  "pt-BR": ptBRCopy,
  "en-US": enUSCopy,
  "es-ES": esESCopy,
};

export function getCopy(locale: Locale): SiteCopy {
  return SITE_COPY[locale];
}

export * from "@/i18n/types";
