/**
 * CodePreview Component
 * 
 * Displays code files with syntax highlighting using Highlight.js (local)
 * Works completely offline!
 * 
 * Features:
 * - Syntax highlighting via local Highlight.js
 * - Line numbers
 * - Copy to clipboard button
 * - VS Code-like dark theme
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/vs2015.css';
import { ThemeConfig } from '../types';

// Map file extensions to Highlight.js language identifiers
const LANGUAGE_MAP: Record<string, string> = {
  'js': 'javascript',
  'jsx': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'json': 'json',
  'jsonc': 'json',
  'html': 'html',
  'htm': 'html',
  'xml': 'xml',
  'svg': 'xml',
  'css': 'css',
  'scss': 'scss',
  'sass': 'scss',
  'less': 'less',
  'md': 'markdown',
  'markdown': 'markdown',
  'py': 'python',
  'rb': 'ruby',
  'java': 'java',
  'c': 'c',
  'cpp': 'cpp',
  'cs': 'csharp',
  'php': 'php',
  'go': 'go',
  'rs': 'rust',
  'sql': 'sql',
  'sh': 'bash',
  'bash': 'bash',
  'ps1': 'powershell',
  'yaml': 'yaml',
  'yml': 'yaml',
  'toml': 'ini',
  'ini': 'ini',
  'cfg': 'ini',
  'conf': 'ini',
  'env': 'bash',
  'txt': 'plaintext',
  'log': 'plaintext',
};

interface CodePreviewProps {
  content: string;
  fileName: string;
  tConfig: ThemeConfig;
  showLineNumbers?: boolean;
}

const CodePreview: React.FC<CodePreviewProps> = ({ 
  content, 
  fileName, 
  tConfig,
  showLineNumbers = true
}) => {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  // Determine language from file extension
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'txt';
  const language = LANGUAGE_MAP[fileExtension] || 'plaintext';

  // Apply syntax highlighting when content or language changes
  useEffect(() => {
    if (!content) {
      setHighlightedCode('');
      return;
    }

    try {
      // Apply highlighting
      let result;
      try {
        result = hljs.highlight(content, { language, ignoreIllegals: true });
      } catch {
        // Fallback to auto-detection
        result = hljs.highlightAuto(content);
      }

      // Add line numbers if enabled
      if (showLineNumbers) {
        const lines = result.value.split('\n');
        const numberedCode = lines.map((line, i) => 
          `<span class="code-line"><span class="line-num">${i + 1}</span><span class="line-content">${line || ' '}</span></span>`
        ).join('\n');
        setHighlightedCode(numberedCode);
      } else {
        setHighlightedCode(result.value);
      }
    } catch (error) {
      console.warn('Highlighting failed, using raw content:', error);
      // Escape HTML and show raw
      const escaped = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      setHighlightedCode(escaped);
    }
  }, [content, language, showLineNumbers]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // File type icon based on extension
  const fileIcon = useMemo(() => {
    const icons: Record<string, string> = {
      'js': '📜', 'jsx': '⚛️', 'ts': '🔷', 'tsx': '⚛️',
      'json': '📋', 'html': '🌐', 'htm': '🌐', 'xml': '📄',
      'css': '🎨', 'scss': '🎨', 'sass': '🎨', 'less': '🎨',
      'py': '🐍', 'rb': '💎', 'java': '☕', 'go': '🐹',
      'rs': '🦀', 'php': '🐘', 'sql': '🗃️', 'sh': '🖥️',
      'yaml': '⚙️', 'yml': '⚙️', 'md': '📝', 'txt': '📄',
    };
    return icons[fileExtension] || '📄';
  }, [fileExtension]);

  return (
    <div className="code-preview-container h-full flex flex-col">
      {/* Header bar */}
      <div className={`code-header flex-shrink-0 flex justify-between items-center px-4 py-2 ${tConfig.ui} border-b ${tConfig.uiBorder}`}>
        <div className="flex items-center gap-3">
          <span className="text-base">{fileIcon}</span>
          <span className={`font-semibold text-sm ${tConfig.fg}`}>{fileName}</span>
          <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
            {language.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs opacity-60">{content.split('\n').length} lines</span>
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-all hover:-translate-y-px"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
      </div>

      {/* Code content */}
      <div className="code-content flex-1 overflow-auto bg-[#1e1e1e]" ref={codeRef}>
        <pre className="m-0 p-4 bg-transparent text-[13px] leading-relaxed min-h-full">
          <code 
            className={`block text-[#d4d4d4] font-mono language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode || content }}
          />
        </pre>
      </div>

      <style>{`
        .code-content::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .code-content::-webkit-scrollbar-track {
          background: #1e1e1e;
        }
        .code-content::-webkit-scrollbar-thumb {
          background: #424242;
          border-radius: 5px;
        }
        .code-content::-webkit-scrollbar-thumb:hover {
          background: #4e4e4e;
        }
        .code-line {
          display: block;
          min-height: 1.5em;
        }
        .code-line:hover {
          background: rgba(255,255,255,0.03);
        }
        .line-num {
          display: inline-block;
          width: 40px;
          text-align: right;
          margin-right: 16px;
          color: #5a5a5a;
          user-select: none;
          font-size: 12px;
        }
        .line-content {
          display: inline;
        }
        /* Override highlight.js background */
        .hljs {
          background: transparent !important;
        }
      `}</style>
    </div>
  );
};

export default CodePreview;
