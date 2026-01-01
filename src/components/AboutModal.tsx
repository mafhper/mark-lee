import React from 'react';
import { X, Github, Heart, ExternalLink } from 'lucide-react';
import { ThemeConfig, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  tConfig: ThemeConfig;
  language: Language;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, tConfig, language }) => {
  if (!isOpen) return null;

  const t = TRANSLATIONS[language];
  const version = '1.0.0';

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={`w-[360px] rounded-xl border shadow-2xl overflow-hidden ${tConfig.ui} ${tConfig.uiBorder}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${tConfig.uiBorder}`}>
          <h2 className={`text-lg font-bold ${tConfig.fg}`}>{t['about.title'] || 'About Mark-Lee'}</h2>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg ${tConfig.fg} opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className={`p-6 text-center ${tConfig.fg}`}>
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img 
              src="/img/logo.png" 
              alt="Mark-Lee" 
              className="w-20 h-20 rounded-2xl shadow-lg"
            />
          </div>

          {/* App Name */}
          <h1 className="text-2xl font-bold mb-1">Mark-Lee</h1>
          <p className="text-sm opacity-60 mb-4">{t['about.version'] || 'Version'} {version}</p>

          {/* Description */}
          <p className="text-sm opacity-80 mb-6 leading-relaxed">
            A minimalist Markdown editor built for focus and productivity.
          </p>

          {/* Author */}
          <div className="mb-6 p-4 rounded-lg bg-black/5 dark:bg-white/5">
            <p className="text-xs opacity-60 mb-2">{t['about.author'] || 'Developed by'}</p>
            <a 
              href="https://github.com/mafhper" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-400 font-semibold transition-colors"
            >
              <Github size={18} />
              @mafhper
              <ExternalLink size={14} />
            </a>
          </div>

          {/* Links */}
          <div className="flex justify-center gap-4 mb-4">
            <a 
              href="https://github.com/mafhper/mark-lee" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors text-sm"
            >
              <Github size={16} />
              {t['about.github'] || 'GitHub'}
            </a>
            <a 
              href="https://github.com/mafhper/mark-lee/issues" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors text-sm"
            >
              <Heart size={16} />
              Contribute
            </a>
          </div>

          {/* License */}
          <p className="text-xs opacity-50">{t['about.license'] || 'Licensed under MIT'}</p>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
