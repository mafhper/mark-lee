import { useCallback, useRef, useState } from "react";
import { Check, Clipboard, Link } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Heading — anchor link automático                                    */
/* ------------------------------------------------------------------ */

type HeadingProps = {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  id?: string;
  children?: React.ReactNode;
  className?: string;
};

export function ProseHeading({ level, id, children, className }: HeadingProps) {
  const HeadingTag = `h${level}` as React.ElementType;
  const slug = id ?? "";

  const handleAnchorClick = useCallback(() => {
    if (!slug) return;
    const url = new URL(window.location.href);
    url.hash = slug;
    navigator.clipboard.writeText(url.toString()).catch(() => undefined);
  }, [slug]);

  return (
    <HeadingTag id={slug} className={className} data-prose-heading>
      {children}
      {slug ? (
        <a
          href={`#${slug}`}
          aria-label="Copy link to this heading"
          className="ml-prose-anchor"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAnchorClick();
          }}
        >
          <Link size={14} />
        </a>
      ) : null}
    </HeadingTag>
  );
}

/* ------------------------------------------------------------------ */
/* CopyButton — feedback visual com timeout                           */
/* ------------------------------------------------------------------ */

export function CopyButton({ content, label }: { content: string; label?: string }) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!copied && timeoutRef.current === null) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, 3000);
    }
  }, [content, copied]);

  return (
    <button
      type="button"
      aria-label={label ?? "Copy to clipboard"}
      className="ml-prose-copy-btn"
      onClick={handleCopy}
      data-copied={copied || undefined}
    >
      {copied ? <Check size={14} /> : <Clipboard size={14} />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* CodeBlock — syntax highlighting + copy button                       */
/* ------------------------------------------------------------------ */

type CodeBlockProps = {
  language?: string;
  children?: React.ReactNode;
  className?: string;
};

export function ProseCodeBlock({ language, children, className }: CodeBlockProps) {
  const codeText = extractText(children);

  return (
    <div className={className} data-prose-code-block>
      {language ? (
        <div className="ml-prose-code-header">
          <span className="ml-prose-code-lang">{language}</span>
          <CopyButton content={codeText} label={`Copy ${language} code`} />
        </div>
      ) : (
        <div className="ml-prose-code-header ml-prose-code-header-no-lang">
          <CopyButton content={codeText} label="Copy code" />
        </div>
      )}
      <pre className="ml-prose-code-pre">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return "";
}
