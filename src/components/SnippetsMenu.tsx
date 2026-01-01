import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { ThemeConfig, Language } from '../types';
import { SNIPPETS } from '../constants';
import { TRANSLATIONS } from '../translations';

interface SnippetsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (content: string) => void;
  tConfig: ThemeConfig;
  language: Language;
}

const SnippetsMenu: React.FC<SnippetsMenuProps> = ({
  isOpen,
  onClose,
  onInsert,
  tConfig,
  language
}) => {
  const t = TRANSLATIONS[language];
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInsert = (content: string) => {
    onInsert(content);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className={`${tConfig.ui} rounded-xl shadow-2xl border ${tConfig.uiBorder} w-[500px] max-h-[70vh] overflow-hidden`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${tConfig.uiBorder}`}>
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-500" />
            <h2 className={`text-lg font-semibold ${tConfig.fg}`}>
              {t['snippets.title'] || 'Snippets'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${tConfig.fg}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Snippets Grid */}
        <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto max-h-[50vh]">
          {SNIPPETS.map((snippet) => (
            <button
              key={snippet.id}
              onClick={() => handleInsert(snippet.content)}
              onMouseEnter={() => setHoveredId(snippet.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`
                flex items-center gap-3 p-3 rounded-lg border transition-all
                ${tConfig.uiBorder} hover:border-indigo-500/50
                hover:bg-indigo-500/10 text-left
              `}
            >
              <span className="text-2xl">{snippet.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${tConfig.fg} truncate`}>{snippet.name}</div>
                <div className={`text-xs ${tConfig.fg} opacity-50 truncate`}>
                  {snippet.content.substring(0, 30)}...
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Preview */}
        {hoveredId && (
          <div className={`p-4 border-t ${tConfig.uiBorder} bg-black/5 dark:bg-white/5`}>
            <div className={`text-xs font-medium ${tConfig.fg} opacity-50 mb-2`}>
              {t['snippets.preview'] || 'Preview'}:
            </div>
            <pre className={`text-xs ${tConfig.fg} opacity-70 whitespace-pre-wrap font-mono`}>
              {SNIPPETS.find(s => s.id === hoveredId)?.content}
            </pre>
          </div>
        )}

        {/* Footer tip */}
        <div className={`px-4 py-2 border-t ${tConfig.uiBorder} text-center`}>
          <span className={`text-xs ${tConfig.fg} opacity-40`}>
            {t['snippets.tip'] || 'Click to insert at cursor position'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SnippetsMenu;
