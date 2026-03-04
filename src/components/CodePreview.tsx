import React, { useEffect, useMemo, useRef, useState } from "react";
import hljs from "highlight.js/lib/core";
import plaintext from "highlight.js/lib/languages/plaintext";
import "highlight.js/styles/vs2015.css";
import { ThemeConfig } from "../types";

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  jsonc: "json",
  html: "xml",
  htm: "xml",
  xml: "xml",
  svg: "xml",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",
  md: "markdown",
  markdown: "markdown",
  py: "python",
  rb: "ruby",
  java: "java",
  c: "c",
  cpp: "cpp",
  cs: "csharp",
  php: "php",
  go: "go",
  rs: "rust",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  ps1: "powershell",
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  ini: "ini",
  cfg: "ini",
  conf: "ini",
  env: "bash",
  txt: "plaintext",
  log: "plaintext",
};

const LANGUAGE_LOADERS: Record<string, () => Promise<{ default: any }>> = {
    javascript: () => import("highlight.js/lib/languages/javascript"),
    typescript: () => import("highlight.js/lib/languages/typescript"),
    json: () => import("highlight.js/lib/languages/json"),
    xml: () => import("highlight.js/lib/languages/xml"),
    css: () => import("highlight.js/lib/languages/css"),
    scss: () => import("highlight.js/lib/languages/scss"),
    less: () => import("highlight.js/lib/languages/less"),
    markdown: () => import("highlight.js/lib/languages/markdown"),
    python: () => import("highlight.js/lib/languages/python"),
    ruby: () => import("highlight.js/lib/languages/ruby"),
    java: () => import("highlight.js/lib/languages/java"),
    c: () => import("highlight.js/lib/languages/c"),
    cpp: () => import("highlight.js/lib/languages/cpp"),
    csharp: () => import("highlight.js/lib/languages/csharp"),
    php: () => import("highlight.js/lib/languages/php"),
    go: () => import("highlight.js/lib/languages/go"),
    rust: () => import("highlight.js/lib/languages/rust"),
    sql: () => import("highlight.js/lib/languages/sql"),
    bash: () => import("highlight.js/lib/languages/bash"),
    powershell: () => import("highlight.js/lib/languages/powershell"),
    yaml: () => import("highlight.js/lib/languages/yaml"),
    ini: () => import("highlight.js/lib/languages/ini"),
  };

const registeredLanguages = new Set<string>();
hljs.registerLanguage("plaintext", plaintext);
registeredLanguages.add("plaintext");

interface CodePreviewProps {
  content: string;
  fileName: string;
  tConfig: ThemeConfig;
  showLineNumbers?: boolean;
}

function escapeHtml(content: string) {
  return content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function ensureLanguage(language: string) {
  if (registeredLanguages.has(language)) return;
  const loader = LANGUAGE_LOADERS[language];
  if (!loader) return;
  const module = await loader();
  hljs.registerLanguage(language, module.default as any);
  registeredLanguages.add(language);
}

const CodePreview: React.FC<CodePreviewProps> = ({
  content,
  fileName,
  tConfig,
  showLineNumbers = true,
}) => {
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "txt";
  const language = LANGUAGE_MAP[fileExtension] || "plaintext";

  useEffect(() => {
    let disposed = false;

    const run = async () => {
      if (!content) {
        if (!disposed) setHighlightedCode("");
        return;
      }

      try {
        await ensureLanguage(language);
        const result = hljs.highlight(content, {
          language: hljs.getLanguage(language) ? language : "plaintext",
          ignoreIllegals: true,
        });

        if (!showLineNumbers) {
          if (!disposed) setHighlightedCode(result.value);
          return;
        }

        const lines = result.value.split("\n");
        const numberedCode = lines
          .map(
            (line, index) =>
              `<span class="code-line"><span class="line-num">${index + 1}</span><span class="line-content">${
                line || " "
              }</span></span>`
          )
          .join("\n");
        if (!disposed) setHighlightedCode(numberedCode);
      } catch {
        if (!disposed) setHighlightedCode(escapeHtml(content));
      }
    };

    run();
    return () => {
      disposed = true;
    };
  }, [content, language, showLineNumbers]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const lineCount = useMemo(() => content.split("\n").length, [content]);

  return (
    <div className="code-preview-container h-full flex flex-col">
      <div className={`code-header flex-shrink-0 flex justify-between items-center px-4 py-2 ${tConfig.ui} border-b ${tConfig.uiBorder}`}>
        <div className="flex items-center gap-3">
          <span className={`font-semibold text-sm ${tConfig.fg}`}>{fileName}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ml-btn-primary">
            {language.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold">{lineCount} lines</span>
          <button
            className="ml-btn-primary px-3 py-1 rounded text-xs font-medium transition-all"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="code-content flex-1 overflow-auto bg-[#0b1020]" ref={codeRef}>
        <pre className="m-0 p-4 bg-transparent text-[13px] leading-relaxed min-h-full">
          <code
            className={`block text-[#e2e8f0] font-mono language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode || escapeHtml(content) }}
          />
        </pre>
      </div>

      <style>{`
        .code-content::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .code-content::-webkit-scrollbar-track {
          background: #0b1020;
        }
        .code-content::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 5px;
        }
        .code-content::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
        .code-line {
          display: block;
          min-height: 1.5em;
        }
        .code-line:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .line-num {
          display: inline-block;
          width: 40px;
          text-align: right;
          margin-right: 16px;
          color: #dbe4f0;
          user-select: none;
          font-size: 12px;
        }
        .line-content {
          display: inline;
        }
        .hljs {
          background: transparent !important;
          color: #e2e8f0 !important;
        }
        .hljs * {
          color: #e2e8f0 !important;
        }
      `}</style>
    </div>
  );
};

export default CodePreview;
