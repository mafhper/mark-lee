import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CtaCopy, Locale, REPO_URL, pathFor } from "@/i18n";

interface SectionLabelProps {
  children: ReactNode;
}

export const SectionLabel = ({ children }: SectionLabelProps) => (
  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-label-foreground">
    {children}
  </span>
);

interface HeroSectionProps {
  label: string;
  title: string;
  description: string;
  mockup?: ReactNode;
}

export const HeroSection = ({ label, title, description, mockup }: HeroSectionProps) => (
  <section className="relative overflow-hidden">
    <div className="pointer-events-none absolute inset-0 bg-gradient-glow" />
    <div className="container py-24 md:py-32">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <SectionLabel>{label}</SectionLabel>
          <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-gradient-hero md:text-[3.25rem]">
            {title}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
            {description}
          </p>
        </motion.div>
        {mockup && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {mockup}
          </motion.div>
        )}
      </div>
    </div>
  </section>
);

interface FeatureRowProps {
  label: string;
  title: string;
  description: string;
  highlights?: string[];
  mockup?: ReactNode;
  reversed?: boolean;
}

export const FeatureRow = ({
  label,
  title,
  description,
  highlights,
  mockup,
  reversed,
}: FeatureRowProps) => (
  <div className={`grid items-center gap-12 md:grid-cols-2 md:gap-16 ${reversed ? "md:[direction:rtl]" : ""}`}>
    <div className={reversed ? "md:[direction:ltr]" : ""}>
      <SectionLabel>{label}</SectionLabel>
      <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">{description}</p>
      {highlights && highlights.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary/70" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
    {mockup && <div className={reversed ? "md:[direction:ltr]" : ""}>{mockup}</div>}
  </div>
);

interface PageCtaSectionProps {
  locale: Locale;
  copy: CtaCopy;
}

export const PageCtaSection = ({ locale, copy }: PageCtaSectionProps) => (
  <section className="border-t border-border/50">
    <div className="container py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-xl border border-border/50"
      >
        <div className="absolute inset-0 bg-gradient-card" />
        <div className="absolute inset-0 bg-gradient-glow opacity-50" />
        <div className="relative p-8 text-center md:p-12">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{copy.title}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{copy.description}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to={pathFor(locale, "downloads")}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none"
            >
              {copy.primaryCta}
              <ArrowRight size={14} />
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
            >
              {copy.secondaryCta}
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

interface MockupCardProps {
  title: string;
  subtitle?: string;
  tabs?: string[];
  activeTab?: number;
  children?: ReactNode;
  badge?: string;
}

export const MockupCard = ({ title, subtitle, tabs, activeTab = 0, children, badge }: MockupCardProps) => (
  <div className="mockup-card">
    <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-label-foreground">{title}</span>
      </div>
      {badge && <span className="text-[11px] text-muted-foreground">{badge}</span>}
    </div>
    {subtitle && <p className="px-4 pt-2 text-xs text-muted-foreground">{subtitle}</p>}
    <div className="min-h-[140px] p-4">
      {children || (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="h-24 w-12 rounded bg-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
              <div className="h-3 w-3/5 rounded bg-muted" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
            </div>
          </div>
        </div>
      )}
    </div>
    {tabs && (
      <div className="flex gap-2 border-t border-border/50 px-4 py-2.5">
        {tabs.map((tab, i) => (
          <span
            key={tab}
            className={`rounded px-2 py-0.5 text-[11px] ${
              i === activeTab ? "bg-secondary font-medium text-foreground" : "text-muted-foreground"
            }`}
          >
            {tab}
          </span>
        ))}
      </div>
    )}
  </div>
);
