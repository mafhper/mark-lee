import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { ThemeConfig, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface FindWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onFind: (text: string, direction: 'next' | 'prev') => void;
  tConfig: ThemeConfig;
  language: Language;
}

const FindWidget: React.FC<FindWidgetProps> = ({ isOpen, onClose, onFind, tConfig, language }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onFind(query, e.shiftKey ? 'prev' : 'next');
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className={`absolute top-4 right-8 z-40 w-80 p-2 rounded-lg shadow-xl border flex items-center gap-2 ${tConfig.ui} ${tConfig.uiBorder}`}>
      <Search size={16} className="opacity-50 ml-1" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t['find.placeholder']}
        className={`flex-1 bg-transparent border-none outline-none text-sm h-8 ${tConfig.fg}`}
      />
      <div className="flex items-center gap-1 border-l pl-2 border-opacity-20 border-gray-500">
        <button 
          onClick={() => onFind(query, 'prev')}
          className={`p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded ${tConfig.fg}`}
          title={`${t['find.prev']} (Shift+Enter)`}
        >
          <ChevronUp size={16} />
        </button>
        <button 
          onClick={() => onFind(query, 'next')}
          className={`p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded ${tConfig.fg}`}
          title={`${t['find.next']} (Enter)`}
        >
          <ChevronDown size={16} />
        </button>
        <button 
          onClick={onClose}
          className={`p-1 hover:bg-red-500 hover:text-white rounded ${tConfig.fg} ml-1`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default FindWidget;