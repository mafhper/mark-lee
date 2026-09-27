import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkGfm from "remark-gfm";
import MarkdownImage from "./MarkdownImage";
import { frontmatterValueToText, parseMarkdownFrontmatter } from "./frontmatter";
import { preprocessMarkdown } from "./preprocessMarkdown";
import { markdownSanitizeSchema } from "./sanitizeSchema";
import { ProseHeading, ProseCodeBlock } from "./prose-components";
import "./prose-components.css";

type MarkdownPreviewProps = {
  activePath?: string | null;
  content: string;
  shellBackground: string;
  surfaceStyle?: React.CSSProperties;
  /** Drop the outer padding and the bordered "surface" card so the prose flows
   *  directly into the page — used by the journal reading view. */
  bare?: boolean;
  /** When set, clicking a hashtag in the body (`#tag`) invokes this — lets the
   *  reading view filter the entry list by a tag mentioned in the prose. */
  onTagClick?: (tag: string) => void;
  /** When set, highlight matching text in the preview (selection sync). */
  highlightedText?: string;
};

function isExternalHref(href?: string) {
  return Boolean(href && /^(https?:)?\/\//i.test(href));
}

function containsOnlyMarkdownImage(children: React.ReactNode) {
  const meaningfulChildren = React.Children.toArray(children).filter(
    (child) => typeof child !== "string" || child.trim().length > 0
  );
  return (
    meaningfulChildren.length === 1 &&
    React.isValidElement(meaningfulChildren[0]) &&
    (meaningfulChildren[0].type === MarkdownImage || meaningfulChildren[0].type === "img")
  );
}

function paragraphNodeContainsOnlyImage(node: unknown) {
  if (!node || typeof node !== "object") return false;
  const children = (node as { children?: unknown }).children;
  if (!Array.isArray(children)) return false;
  const meaningfulChildren = children.filter((child) => {
    if (!child || typeof child !== "object") return false;
    const type = (child as { type?: unknown }).type;
    const value = (child as { value?: unknown }).value;
    return type !== "text" || (typeof value === "string" && value.trim().length > 0);
  });
  return meaningfulChildren.length === 1 && nodeIsImageLike(meaningfulChildren[0]);
}

function nodeIsImageLike(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const tagName = (node as { tagName?: unknown }).tagName;
  if (tagName === "img") return true;
  if (tagName !== "a") return false;

  const children = (node as { children?: unknown }).children;
  if (!Array.isArray(children)) return false;
  const meaningfulChildren = children.filter((child) => {
    if (!child || typeof child !== "object") return false;
    const type = (child as { type?: unknown }).type;
    const value = (child as { value?: unknown }).value;
    return type !== "text" || (typeof value === "string" && value.trim().length > 0);
  });
  return (
    meaningfulChildren.length === 1 &&
    (meaningfulChildren[0] as { tagName?: unknown }).tagName === "img"
  );
}

function nodeContainsImage(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  if ((node as { tagName?: unknown }).tagName === "img") return true;
  const children = (node as { children?: unknown }).children;
  return Array.isArray(children) && children.some(nodeContainsImage);
}

function removeInvalidTableText(children: React.ReactNode) {
  return React.Children.toArray(children).filter(
    (child) => typeof child !== "string" || child.trim().length === 0
  );
}

function MediaPlaceholder({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="ml-preview-media-placeholder">
      <span className="ml-preview-media-placeholder-title">{label}</span>
      {children ? <span className="ml-preview-media-placeholder-detail">{children}</span> : null}
    </div>
  );
}

function extractNodeText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const value = (node as { value?: unknown }).value;
  if (typeof value === "string") return value;
  const children = (node as { children?: unknown }).children;
  if (!Array.isArray(children)) return "";
  return children.map(extractNodeText).join("");
}

function getCalloutKind(node: unknown) {
  const match = extractNodeText(node).trimStart().match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function stripCalloutMarker(children: React.ReactNode) {
  let removed = false;
  return React.Children.map(children, (child) => {
    if (removed || !React.isValidElement<{ children?: React.ReactNode }>(child)) return child;

    const nextChildren = React.Children.map(child.props.children, (grandchild) => {
      if (removed || typeof grandchild !== "string") return grandchild;
      const next = grandchild.replace(/^\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i, "");
      if (next !== grandchild) removed = true;
      return next;
    });

    return removed ? React.cloneElement(child, child.props, nextChildren) : child;
  });
}

function highlightText(text: string, highlight: string): string {
  if (!highlight || !text) return text;
  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})`, "gi"), '<mark class="ml-selection-highlight">$1</mark>');
}

export default function MarkdownPreview({
  activePath,
  content,
  shellBackground,
  surfaceStyle,
  bare = false,
  onTagClick,
  highlightedText,
}: MarkdownPreviewProps) {
  const { meta, body } = React.useMemo(() => parseMarkdownFrontmatter(content), [content]);
  const processedBody = React.useMemo(() => {
    const processed = preprocessMarkdown(body);
    return highlightedText ? highlightText(processed, highlightedText) : processed;
  }, [body, highlightedText]);
  const hasMeta = Object.keys(meta).length > 0;
  const defaultPreviewStyle = React.useMemo(() => ({
    backgroundColor: shellBackground,
    "--ml-preview-bg": "var(--ml-editor-bg, var(--ml-bg, #ffffff))",
    "--ml-preview-text": "var(--ml-editor-fg, var(--ml-fg, #111827))",
    "--ml-preview-accent": "var(--ml-accent, #4f46e5)",
    "--ml-preview-muted": "color-mix(in srgb, var(--ml-editor-fg, var(--ml-fg, #111827)) 76%, var(--ml-editor-bg, var(--ml-bg, #ffffff)) 24%)",
    "--ml-preview-border": "color-mix(in srgb, var(--ml-editor-fg, var(--ml-fg, #111827)) 20%, transparent)",
    "--ml-preview-frontmatter-bg": "color-mix(in srgb, var(--ml-editor-fg, var(--ml-fg, #111827)) 6%, transparent)",
    "--ml-preview-frontmatter-border": "1px solid color-mix(in srgb, var(--ml-editor-fg, var(--ml-fg, #111827)) 18%, transparent)",
  }) as React.CSSProperties, [shellBackground]);

  // Delegate clicks on body hashtags (rendered as <span class="ml-preview-tag"
  // data-tag="…">) to the host instead of wiring a handler per span.
  const handleTagClick = onTagClick
    ? (e: React.MouseEvent<HTMLElement>) => {
        const el = (e.target as HTMLElement).closest<HTMLElement>(".ml-preview-tag[data-tag]");
        const tag = el?.dataset.tag;
        if (tag) { e.preventDefault(); onTagClick(tag); }
      }
    : undefined;

  return (
    <div className={bare ? "min-h-full" : "min-h-full p-5"} style={defaultPreviewStyle}>
      <div className={bare ? "mx-auto" : "ml-preview-surface mx-auto"} style={surfaceStyle}>
        {hasMeta ? (
          <div className="ml-frontmatter-card mb-6 rounded-lg border px-5 py-4">
            <div className="ml-frontmatter-title mb-2">Metadata</div>
            <dl className="grid gap-x-4 gap-y-1" style={{ gridTemplateColumns: "auto 1fr" }}>
              {Object.entries(meta).map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt className="text-xs font-semibold capitalize">{key}</dt>
                  <dd className="text-xs">{frontmatterValueToText(value)}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        ) : null}

        <article className={onTagClick ? "ml-preview-prose ml-preview-tags-clickable" : "ml-preview-prose"} onClick={handleTagClick}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
              rehypeRaw,
              [rehypeSanitize, markdownSanitizeSchema],
              rehypeSlug,
              [rehypeAutolinkHeadings, { behavior: "wrap" }],
            ]}
            components={{
              h1: ({ node: _node, ...props }) => <ProseHeading level={1} {...props} />,
              h2: ({ node: _node, ...props }) => <ProseHeading level={2} {...props} />,
              h3: ({ node: _node, ...props }) => <ProseHeading level={3} {...props} />,
              h4: ({ node: _node, ...props }) => <ProseHeading level={4} {...props} />,
              h5: ({ node: _node, ...props }) => <ProseHeading level={5} {...props} />,
              h6: ({ node: _node, ...props }) => <ProseHeading level={6} {...props} />,
              pre: ({ node: _node, children, ...props }) => {
                const codeChild = React.Children.toArray(children).find(
                  (child) => React.isValidElement(child) && child.type === "code"
                );
                if (codeChild && React.isValidElement(codeChild)) {
                  const codeProps = codeChild.props as { className?: string; children?: React.ReactNode };
                  const langMatch = codeProps.className?.match(/language-(\w+)/);
                  const language = langMatch?.[1];
                  return (
                    <ProseCodeBlock language={language}>
                      {codeProps.children}
                    </ProseCodeBlock>
                  );
                }
                return <pre {...props}>{children}</pre>;
              },
              a: ({ node: _node, href, ...props }) => (
                <a
                  {...props}
                  href={href}
                  data-ml-original-href={href || undefined}
                  rel={isExternalHref(href) ? "noopener noreferrer" : props.rel}
                  target={isExternalHref(href) ? "_blank" : props.target}
                />
              ),
              img: ({ node: _node, ...props }) => (
                <MarkdownImage {...props} basePath={activePath ?? null} />
              ),
              blockquote: ({ node, children, ...props }) => {
                const calloutKind = getCalloutKind(node);
                return (
                  <blockquote
                    {...props}
                    className={calloutKind ? "ml-preview-callout" : props.className}
                    data-callout={calloutKind ?? undefined}
                  >
                    {calloutKind ? stripCalloutMarker(children) : children}
                  </blockquote>
                );
              },
              p: ({ node, children, ...props }) =>
                paragraphNodeContainsOnlyImage(node) || containsOnlyMarkdownImage(children) ? (
                  <>{children}</>
                ) : nodeContainsImage(node) ? (
                  <div className="ml-preview-media-paragraph">{children}</div>
                ) : (
                  <p {...props}>{children}</p>
                ),
              table: ({ node: _node, children, ...props }) => (
                <div className="ml-preview-table-wrap" style={{ overflowX: "auto" }}>
                  <table {...props} style={{ minWidth: "100%", width: "auto", tableLayout: "auto" }}>
                    {removeInvalidTableText(children)}
                  </table>
                </div>
              ),
              video: ({ node: _node, children: _children, poster, width }) => (
                <MediaPlaceholder label="Video">
                  {poster ? `Poster: ${poster}` : width ? `Width: ${width}` : "HTML video element"}
                </MediaPlaceholder>
              ),
              audio: () => (
                <MediaPlaceholder label="Audio">HTML audio element</MediaPlaceholder>
              ),
            }}
          >
            {processedBody}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}

