import metadata from "@/i18n/meta.json";
import { Locale, PageKey, PageMeta } from "@/i18n/types";

const SITE_META = metadata as Record<Locale, Record<PageKey, PageMeta>>;

export function getPageMeta(locale: Locale, page: PageKey): PageMeta {
  return SITE_META[locale][page] ?? SITE_META[locale].home;
}

export { SITE_META };
