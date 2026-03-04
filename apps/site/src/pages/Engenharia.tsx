import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { EngineeringHeroMockup } from "@/components/EditorMockup";
import PageLayout from "@/components/PageLayout";
import {
  HeroSection,
  PageCtaSection,
  SectionLabel,
} from "@/components/SectionComponents";
import { Locale, REPO_URL, getCopy } from "@/i18n";
import { RecentCommit, fetchRecentCommits, formatCommitDate } from "@/lib/github";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const techIcons = [
  (
    <svg viewBox="0 0 32 32" className="h-8 w-8">
      <circle cx="16" cy="16" r="3" className="fill-primary" />
      <ellipse cx="16" cy="16" rx="14" ry="5" className="stroke-primary/50" strokeWidth="1.2" fill="none" />
      <ellipse
        cx="16"
        cy="16"
        rx="14"
        ry="5"
        className="stroke-primary/50"
        strokeWidth="1.2"
        fill="none"
        transform="rotate(60 16 16)"
      />
      <ellipse
        cx="16"
        cy="16"
        rx="14"
        ry="5"
        className="stroke-primary/50"
        strokeWidth="1.2"
        fill="none"
        transform="rotate(120 16 16)"
      />
    </svg>
  ),
  (
    <svg viewBox="0 0 32 32" className="h-8 w-8">
      <circle cx="16" cy="16" r="12" className="stroke-primary/50" strokeWidth="1.2" fill="none" />
      <circle cx="16" cy="16" r="3" className="fill-primary/60" />
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <line
          key={angle}
          x1="16"
          y1="16"
          x2={16 + 11 * Math.cos((angle * Math.PI) / 180)}
          y2={16 + 11 * Math.sin((angle * Math.PI) / 180)}
          className="stroke-primary/30"
          strokeWidth="1"
        />
      ))}
    </svg>
  ),
  (
    <svg viewBox="0 0 32 32" className="h-8 w-8">
      <path
        d="M8 18 C10 12, 14 10, 16 14 C18 10, 22 12, 24 18"
        className="stroke-primary/60"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M8 22 C10 16, 14 14, 16 18 C18 14, 22 16, 24 22"
        className="stroke-primary/30"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  ),
  (
    <svg viewBox="0 0 32 32" className="h-8 w-8">
      <path
        d="M6 8 L16 28 L26 8"
        className="stroke-primary/60"
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M18 4 L14 14" className="stroke-primary/40" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  (
    <svg viewBox="0 0 32 32" className="h-8 w-8">
      <rect x="6" y="8" width="20" height="14" rx="2" className="stroke-primary/50" strokeWidth="1.2" fill="none" />
      <rect x="9" y="11" width="14" height="8" rx="1" className="fill-primary/15" />
      <line x1="12" y1="22" x2="20" y2="22" className="stroke-primary/30" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="22" x2="16" y2="25" className="stroke-primary/30" strokeWidth="1.5" />
    </svg>
  ),
];

interface EngenhariaProps {
  locale: Locale;
}

const Engenharia = ({ locale }: EngenhariaProps) => {
  const copy = getCopy(locale).pages.engineering;
  const [commits, setCommits] = useState<RecentCommit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadCommits = async () => {
      setLoadingCommits(true);
      const data = await fetchRecentCommits(3);
      if (cancelled) return;
      setCommits(data);
      setLoadingCommits(false);
    };

    loadCommits();

    return () => {
      cancelled = true;
    };
  }, []);


  return (
    <PageLayout locale={locale}>
      <HeroSection
        label={copy.hero.label}
        title={copy.hero.title}
        description={copy.hero.description}
        mockup={<EngineeringHeroMockup />}
      />

      <section className="border-t border-border/50">
        <div className="container py-24">
          <motion.div {...fadeInUp}>
            <SectionLabel>{copy.architectureSection.label}</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {copy.architectureSection.title}
            </h2>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">{copy.architectureSection.description}</p>
          </motion.div>

          <div className="mt-12 grid items-center gap-12 md:grid-cols-2">
            <div className="space-y-3">
              {copy.architectureSection.layers.map((layer, i) => (
                <motion.div
                  key={layer.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className={`rounded-lg border px-4 py-3 ${layer.colorClass}`}
                >
                  <div className="text-sm font-semibold">{layer.name}</div>
                  <div className="mt-0.5 text-[11px] opacity-70">{layer.description}</div>
                </motion.div>
              ))}
            </div>

            <div className="mockup-card p-6">
              <div className="mb-4 text-[10px] uppercase tracking-wider text-muted-foreground/50">
                {copy.architectureSection.flowTitle}
              </div>
              <svg viewBox="0 0 300 200" className="w-full" fill="none">
                <rect x="20" y="10" width="80" height="35" rx="6" className="fill-primary/15 stroke-primary/30" strokeWidth="1" />
                <text x="60" y="32" textAnchor="middle" className="fill-primary" style={{ fontSize: "10px", fontWeight: 600 }}>
                  {copy.architectureSection.flowLabels.ui}
                </text>

                <rect x="200" y="10" width="80" height="35" rx="6" className="fill-primary/15 stroke-primary/30" strokeWidth="1" />
                <text x="240" y="32" textAnchor="middle" className="fill-primary" style={{ fontSize: "10px", fontWeight: 600 }}>
                  {copy.architectureSection.flowLabels.preview}
                </text>

                <rect x="110" y="80" width="80" height="35" rx="6" className="fill-secondary stroke-border/50" strokeWidth="1" />
                <text x="150" y="102" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: "10px", fontWeight: 600 }}>
                  {copy.architectureSection.flowLabels.bridge}
                </text>

                <rect x="20" y="150" width="80" height="35" rx="6" className="fill-secondary/60 stroke-border/40" strokeWidth="1" />
                <text x="60" y="172" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: "10px", fontWeight: 600 }}>
                  {copy.architectureSection.flowLabels.core}
                </text>

                <rect x="200" y="150" width="80" height="35" rx="6" className="fill-secondary/60 stroke-border/40" strokeWidth="1" />
                <text x="240" y="172" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: "10px", fontWeight: 600 }}>
                  {copy.architectureSection.flowLabels.filesystem}
                </text>

                <path d="M60 45 L150 80" className="stroke-primary/30" strokeWidth="1.5" />
                <path d="M240 45 L155 80" className="stroke-primary/30" strokeWidth="1.5" />
                <path d="M145 115 L60 150" className="stroke-muted-foreground/20" strokeWidth="1.5" />
                <path d="M155 115 L240 150" className="stroke-muted-foreground/20" strokeWidth="1.5" />
                <path d="M100 167 L200 167" className="stroke-muted-foreground/15" strokeWidth="1.5" strokeDasharray="4,3" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/50">
        <div className="container py-24">
          <motion.div {...fadeInUp} className="mb-16">
            <SectionLabel>{copy.stackSection.label}</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {copy.stackSection.title}
            </h2>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">{copy.stackSection.description}</p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {copy.stackSection.items.map((tech, i) => (
              <motion.div
                key={tech.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group relative rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/20"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-4">{techIcons[i]}</div>
                  <h3 className="text-base font-bold text-foreground">{tech.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tech.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {tech.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/50">
        <div className="container py-24">
          <motion.div {...fadeInUp} className="mb-10">
            <SectionLabel>{copy.recentCommitsSection.label}</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {copy.recentCommitsSection.title}
            </h2>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">{copy.recentCommitsSection.description}</p>
          </motion.div>

          {loadingCommits ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-lg border border-border/40 bg-secondary/30" />
              ))}
            </div>
          ) : commits.length === 0 ? (
            <p className="rounded-lg border border-border/40 bg-card p-4 text-sm text-muted-foreground">
              {copy.recentCommitsSection.emptyMessage}
            </p>
          ) : (
            <div className="space-y-3">
              {commits.map((commit) => (
                <a
                  key={commit.sha}
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-lg border border-border/40 bg-card p-4 transition-colors hover:border-primary/20"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs text-primary">{commit.sha}</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{commit.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatCommitDate(commit.date, locale)}
                        {commit.author ? ` · ${commit.author}` : ""}
                      </p>
                    </div>
                    <ExternalLink size={14} className="text-muted-foreground transition-colors group-hover:text-foreground" />
                  </div>
                </a>
              ))}
            </div>
          )}

          <a
            href={`${REPO_URL}/commits/main`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:underline"
          >
            {copy.recentCommitsSection.viewAllLabel}
            <ExternalLink size={14} />
          </a>
        </div>
      </section>

      <PageCtaSection locale={locale} copy={copy.ctaSection} />
    </PageLayout>
  );
};

export default Engenharia;
