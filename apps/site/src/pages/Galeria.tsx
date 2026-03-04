import { useState } from "react";
import { motion } from "framer-motion";
import {
  FocusModeMockup,
  PreviewPresetMockup,
  SnippetModelsMockup,
  ThemeCycleHeroMockup,
  ThemePreviewMockup,
  WorkspaceContextMockup,
} from "@/components/EditorMockup";
import PageLayout from "@/components/PageLayout";
import {
  FeatureRow,
  HeroSection,
  PageCtaSection,
  SectionLabel,
} from "@/components/SectionComponents";
import { GalleryPreviewVisual, Locale, getCopy } from "@/i18n";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

interface GaleriaProps {
  locale: Locale;
}

const Galeria = ({ locale }: GaleriaProps) => {
  const copy = getCopy(locale).pages.gallery;
  const [activeTheme, setActiveTheme] = useState(0);

  const previewMockupByVisual: Record<GalleryPreviewVisual, JSX.Element> = {
    preview: <PreviewPresetMockup locale={locale} />,
    focus: <FocusModeMockup locale={locale} />,
    workspace: <WorkspaceContextMockup locale={locale} />,
    snippets: <SnippetModelsMockup locale={locale} />,
  };

  return (
    <PageLayout locale={locale}>
      <HeroSection
        label={copy.hero.label}
        title={copy.hero.title}
        description={copy.hero.description}
        mockup={<ThemeCycleHeroMockup themes={copy.themesSection.items} />}
      />

      <section className="border-t border-border/50">
        <div className="container py-24">
          <motion.div {...fadeInUp}>
            <SectionLabel>{copy.themesSection.label}</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {copy.themesSection.title}
            </h2>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">{copy.themesSection.description}</p>
          </motion.div>

          <div className="mt-8 flex flex-wrap gap-2">
            {copy.themesSection.items.map((theme, i) => (
              <button
                type="button"
                key={theme.name}
                onClick={() => setActiveTheme(i)}
                className={`rounded-md px-3 py-1.5 text-sm transition-all focus-visible:outline-none ${
                  activeTheme === i
                    ? "bg-secondary font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {theme.name}
              </button>
            ))}
          </div>

          <motion.div
            key={activeTheme}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="mt-8 grid items-start gap-12 md:grid-cols-2"
          >
            <div>
              <h3 className="text-2xl font-bold text-foreground">{copy.themesSection.items[activeTheme].name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {copy.themesSection.items[activeTheme].description}
              </p>
              <div className="mt-6 flex gap-3">
                {copy.themesSection.items[activeTheme].colors.map((color) => (
                  <div key={color} className="flex flex-col items-center gap-1.5">
                    <div
                      className="h-10 w-10 rounded-lg border border-border/50 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-mono text-[9px] text-muted-foreground/50">{color}</span>
                  </div>
                ))}
              </div>
            </div>
            <ThemePreviewMockup
              colors={copy.themesSection.items[activeTheme].colors}
              name={copy.themesSection.items[activeTheme].name}
              locale={locale}
            />
          </motion.div>
        </div>
      </section>

      <section className="border-t border-border/50">
        <div className="container py-24">
          <motion.div {...fadeInUp} className="mb-16 text-center">
            <SectionLabel>{copy.previewSection.label}</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {copy.previewSection.title}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{copy.previewSection.description}</p>
          </motion.div>

          <div className="space-y-20">
            {copy.previewSection.items.map((item, index) => (
              <motion.div key={item.title} {...fadeInUp}>
                <FeatureRow
                  label={item.label}
                  title={item.title}
                  description={item.description}
                  reversed={index % 2 === 1}
                  mockup={previewMockupByVisual[item.visual]}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <PageCtaSection locale={locale} copy={copy.ctaSection} />
    </PageLayout>
  );
};

export default Galeria;
