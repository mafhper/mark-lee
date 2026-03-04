import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Apple, ArrowRight, Monitor, Terminal } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { SectionLabel } from "@/components/SectionComponents";
import { DownloadPlatform, Locale, RELEASES_URL, getCopy } from "@/i18n";
import { ReleaseAssetMap, fetchStableReleaseAssets } from "@/lib/github";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const platformIcons = [Monitor, Apple, Terminal];

interface DownloadsProps {
  locale: Locale;
}

function downloadUrlForPlatform(platform: DownloadPlatform, assets: ReleaseAssetMap | null): string {
  if (!assets) return `${RELEASES_URL}/latest`;
  return assets[platform] || `${RELEASES_URL}/latest`;
}

const Downloads = ({ locale }: DownloadsProps) => {
  const copy = getCopy(locale).pages.downloads;
  const [assets, setAssets] = useState<ReleaseAssetMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAssets = async () => {
      const releaseAssets = await fetchStableReleaseAssets();
      if (!cancelled) setAssets(releaseAssets);
    };

    loadAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageLayout locale={locale}>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-glow" />
        <div className="container py-24 md:py-32">
          <motion.div {...fadeInUp} className="max-w-xl">
            <SectionLabel>{copy.hero.label}</SectionLabel>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-gradient-hero md:text-[3.25rem]">
              {copy.hero.title}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">{copy.hero.description}</p>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-border/50">
        <div className="container py-24">
          <motion.div {...fadeInUp}>
            <h2 className="mb-8 text-2xl font-bold text-foreground">{copy.section.title}</h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {copy.section.items.map((platform, index) => {
              const Icon = platformIcons[index] ?? Monitor;
              const href = downloadUrlForPlatform(platform.platform, assets);
              const isFallback = href.endsWith("/releases/latest");

              return (
                <motion.article
                  key={platform.name}
                  {...fadeInUp}
                  className="group rounded-lg border border-border/50 bg-card p-6 transition-colors hover:border-primary/30"
                >
                  <Icon size={24} className="mb-4 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">{platform.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{platform.status}</p>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors group-hover:underline"
                  >
                    {isFallback ? copy.section.fallbackLabel : copy.section.buttonLabel}
                    <ArrowRight size={14} />
                  </a>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Downloads;
