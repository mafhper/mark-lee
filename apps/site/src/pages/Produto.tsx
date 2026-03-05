import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  EditorMockup,
  PreviewPresetMockup,
  SnippetModelsMockup,
  WorkspaceContextMockup,
  ExportMockup,
  SplitViewMockup,
} from "@/components/EditorMockup";
import {
  LightweightIllustration,
  MarkdownIllustration,
  MultiplatformIllustration,
  OpenSourceIllustration,
} from "@/components/FeatureIllustrations";
import PageLayout from "@/components/PageLayout";
import {
  FeatureRow,
  HeroSection,
  PageCtaSection,
  SectionLabel,
} from "@/components/SectionComponents";
import { Locale, getCopy, pathFor } from "@/i18n";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const statIllustrations = [
  <MarkdownIllustration key="markdown" />,
  <MultiplatformIllustration key="multiplatform" />,
  <OpenSourceIllustration key="opensource" />,
  <LightweightIllustration key="lightweight" />,
];

interface ProdutoProps {
  locale: Locale;
}

const Produto = ({ locale }: ProdutoProps) => {
  const copy = getCopy(locale).pages.home;
  const capabilityMockups = [
    <EditorMockup key="editor" locale={locale} />,
    <WorkspaceContextMockup key="workspace" locale={locale} />,
    <SplitViewMockup key="splitview" locale={locale} />,
    <ExportMockup key="export" locale={locale} />,
    <SnippetModelsMockup key="snippets" locale={locale} />,
  ];

  return (
    <PageLayout locale={locale}>
      <HeroSection
        label={copy.hero.label}
        title={copy.hero.title}
        description={copy.hero.description}
        mockup={<EditorMockup locale={locale} />}
      />

      <section className="relative border-t border-border/50">
        <div className="pointer-events-none absolute inset-0 bg-gradient-section" />
        <div className="container py-24">
          <motion.div {...fadeInUp}>
            <SectionLabel>{copy.statsSection.label}</SectionLabel>
            <h2 className="mt-3 max-w-lg text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {copy.statsSection.title}
            </h2>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">{copy.statsSection.description}</p>
          </motion.div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={pathFor(locale, "downloads")}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none"
            >
              {copy.statsSection.primaryCta}
            </Link>
            <Link
              to={pathFor(locale, "gallery")}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
            >
              {copy.statsSection.secondaryCta}
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {copy.statsSection.cards.map((card, i) => (
              <motion.div
                key={card.value}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group"
              >
                {statIllustrations[i]}
                <div className="mt-4">
                  <p className="text-sm font-semibold text-foreground">{card.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{card.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/50">
        <div className="container py-24">
          <motion.div {...fadeInUp} className="mb-16 text-center">
            <SectionLabel>{copy.capabilitiesSection.label}</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {copy.capabilitiesSection.title}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              {copy.capabilitiesSection.description}
            </p>
          </motion.div>

          <div className="space-y-24">
            {copy.capabilitiesSection.items.map((item, i) => (
              <motion.div key={item.title} {...fadeInUp}>
                <FeatureRow
                  label={item.label}
                  title={item.title}
                  description={item.description}
                  highlights={item.highlights}
                  reversed={i % 2 === 1}
                  mockup={capabilityMockups[i] ?? <EditorMockup locale={locale} />}
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

export default Produto;
