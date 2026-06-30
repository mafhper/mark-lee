import { Folder, Github, ArrowDownToLine, FileText, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import ProductFrame from "@/components/ProductFrame";
import { Locale, REPO_URL, getCopy, pathFor } from "@/i18n";
import "./Produto.css";

interface ProdutoProps {
  locale: Locale;
}

const Produto = ({ locale }: ProdutoProps) => {
  const copy = getCopy(locale).pages.home;

  return (
    <PageLayout locale={locale}>
      <section className="home-hero">
        <div className="home-shell home-hero__grid">
          <div className="home-hero__copy">
            <p className="home-eyebrow">{copy.hero.label}</p>
            <h1>{copy.hero.title}</h1>
            <p className="home-lede">{copy.hero.description}</p>
            <div className="home-actions">
              <Link to={pathFor(locale, "downloads")} className="site-button">
                <ArrowDownToLine size={17} aria-hidden="true" />
                {copy.hero.primaryCta}
              </Link>
              <a href="#dois-contextos" className="site-text-link">
                {copy.hero.secondaryCta}
              </a>
            </div>
            <p className="home-note">{copy.hero.note}</p>
          </div>
          <ProductFrame visual="editor" locale={locale} eager className="home-hero__visual" />
        </div>
      </section>

      <section id="dois-contextos" className="home-paper home-section">
        <div className="home-shell">
          <header className="home-section-heading home-section-heading--paper">
            <p className="home-eyebrow">{copy.continuity.label}</p>
            <h2>{copy.continuity.title}</h2>
            <p>{copy.continuity.description}</p>
          </header>
          <div className="continuity-pair">
            <ProductFrame
              visual="editor"
              locale={locale}
              label={copy.continuity.editorLabel}
              className="product-frame--paper"
            />
            <ProductFrame
              visual="memoriesReading"
              locale={locale}
              label={copy.continuity.memoriesLabel}
              className="product-frame--paper"
            />
            <div className="continuity-file">
              <FileText size={16} aria-hidden="true" />
              <span>{copy.continuity.fileName}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="editor" className="home-section home-dark">
        <div className="home-shell feature-stage">
          <FeatureCopy
            label={copy.editor.label}
            title={copy.editor.title}
            description={copy.editor.description}
            highlights={copy.editor.highlights}
          />
          <ProductFrame visual="editor" locale={locale} />
        </div>
      </section>

      <section id="memorias" className="home-section home-paper">
        <div className="home-shell memories-stage">
          <FeatureCopy
            label={copy.memories.label}
            title={copy.memories.title}
            description={copy.memories.description}
            highlights={copy.memories.highlights}
            paper
          />
          <div className="memories-mosaic">
            <ProductFrame
              visual="memoriesReading"
              locale={locale}
              className="product-frame--paper memories-mosaic__primary"
            />
            <ProductFrame
              visual="memoriesExplore"
              locale={locale}
              className="product-frame--paper memories-mosaic__secondary"
            />
          </div>
        </div>
      </section>

      <section id="local" className="home-section home-local">
        <div className="home-shell home-local__grid">
          <div className="file-tree" aria-label={copy.localProof.folderLabel}>
            <div className="file-tree__folder">
              <Folder size={18} aria-hidden="true" />
              <span>{copy.localProof.folderLabel}</span>
            </div>
            <ul>
              {copy.localProof.files.map((file) => (
                <li key={file}>
                  {file.endsWith(".jpg") ? (
                    <ImageIcon size={15} aria-hidden="true" />
                  ) : (
                    <FileText size={15} aria-hidden="true" />
                  )}
                  <span>{file}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <header className="home-section-heading">
              <p className="home-eyebrow">{copy.localProof.label}</p>
              <h2>{copy.localProof.title}</h2>
              <p>{copy.localProof.description}</p>
            </header>
            <dl className="local-principles">
              {copy.localProof.principles.map((principle) => (
                <div key={principle.title}>
                  <dt>{principle.title}</dt>
                  <dd>{principle.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="home-closing">
        <div className="home-shell home-closing__inner">
          <h2>{copy.closingCta.title}</h2>
          <p>{copy.closingCta.description}</p>
          <div className="home-actions home-actions--center">
            <Link to={pathFor(locale, "downloads")} className="site-button">
              <ArrowDownToLine size={17} aria-hidden="true" />
              {copy.closingCta.primaryCta}
            </Link>
            <a className="site-text-link" href={REPO_URL} target="_blank" rel="noopener noreferrer">
              <Github size={17} aria-hidden="true" />
              {copy.closingCta.secondaryCta}
            </a>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

interface FeatureCopyProps {
  label: string;
  title: string;
  description: string;
  highlights: string[];
  paper?: boolean;
}

const FeatureCopy = ({ label, title, description, highlights, paper = false }: FeatureCopyProps) => (
  <div className={`feature-copy${paper ? " feature-copy--paper" : ""}`}>
    <p className="home-eyebrow">{label}</p>
    <h2>{title}</h2>
    <p>{description}</p>
    <ul>
      {highlights.map((highlight) => (
        <li key={highlight}>{highlight}</li>
      ))}
    </ul>
  </div>
);

export default Produto;
