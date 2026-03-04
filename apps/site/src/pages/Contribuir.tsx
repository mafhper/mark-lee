import { motion } from "framer-motion";
import PageLayout from "@/components/PageLayout";
import { HeroSection, SectionLabel } from "@/components/SectionComponents";
import { Locale, REPO_URL, getCopy } from "@/i18n";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const stepIcons = [
  (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" className="stroke-primary/40" />
      <path d="M12 8v4M12 16h.01" className="stroke-primary" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" className="stroke-primary/60" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="18" cy="18" r="3" className="stroke-primary/50" />
      <circle cx="6" cy="6" r="3" className="stroke-primary/50" />
      <path d="M6 9v9a3 3 0 003 3h6" className="stroke-primary/40" />
    </svg>
  ),
];

interface ContribuirProps {
  locale: Locale;
}

const Contribuir = ({ locale }: ContribuirProps) => {
  const copy = getCopy(locale).pages.contributing;

  return (
    <PageLayout locale={locale}>
      <HeroSection
        label={copy.hero.label}
        title={copy.hero.title}
        description={copy.hero.description}
        mockup={
          <div className="mockup-card p-6">
            <div className="mb-4 text-[10px] uppercase tracking-wider text-muted-foreground/50">{copy.hero.flowTitle}</div>
            <div className="flex flex-wrap items-center gap-3">
              {copy.hero.flowSteps.map((item, i) => (
                <div key={item} className="flex items-center gap-3">
                  <div
                    className={`rounded-md border px-3 py-2 text-[11px] font-medium ${
                      i === 0
                        ? "border-primary/20 bg-primary/15 text-primary"
                        : i === copy.hero.flowSteps.length - 1
                          ? "border-green-500/20 bg-green-500/10 text-green-400/70"
                          : "border-border/30 bg-secondary text-muted-foreground"
                    }`}
                  >
                    {item}
                  </div>
                  {i < copy.hero.flowSteps.length - 1 && <span className="text-xs text-muted-foreground/20">→</span>}
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-[10px]">
                <div className="h-2 w-2 rounded-full bg-green-500/50" />
                <span className="text-muted-foreground/60">{copy.hero.testsLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="h-2 w-2 rounded-full bg-primary/50" />
                <span className="text-muted-foreground/60">{copy.hero.buildLabel}</span>
              </div>
            </div>
          </div>
        }
      />

      <section className="border-t border-border/50">
        <div className="container py-24">
          <motion.div {...fadeInUp}>
            <SectionLabel>{copy.stepsSection.label}</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {copy.stepsSection.title}
            </h2>
          </motion.div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {copy.stepsSection.items.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-primary/20"
              >
                <div className="mb-4 flex items-center gap-3">
                  {stepIcons[i]}
                  <span className="font-mono text-[11px] font-bold text-muted-foreground/40">{step.step}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  {copy.stepsSection.githubCta} →
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/50">
        <div className="container py-24">
          <motion.div {...fadeInUp}>
            <SectionLabel>{copy.guideSection.label}</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{copy.guideSection.title}</h2>
          </motion.div>

          <div className="mt-12 max-w-2xl space-y-6">
            {copy.guideSection.items.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="h-full min-h-[48px] w-1 shrink-0 rounded-full bg-primary/20" />
                <div>
                  <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/50">
        <div className="container py-24">
          <motion.div {...fadeInUp}>
            <SectionLabel>{copy.qualitySection.label}</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{copy.qualitySection.title}</h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{copy.qualitySection.description}</p>
          </motion.div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              {copy.qualitySection.principles.map((principle) => (
                <div key={principle.title} className="rounded-lg border border-border/40 bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground">{principle.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{principle.description}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border/40 bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">{copy.qualitySection.scriptsTitle}</h3>
              <div className="mt-4 space-y-3">
                {copy.qualitySection.scripts.map((script) => (
                  <div key={script.command} className="rounded border border-border/40 bg-secondary/30 p-3">
                    <code className="text-[11px] text-primary">{script.command}</code>
                    <p className="mt-1 text-xs text-muted-foreground">{script.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Contribuir;
