import React from 'react';
import { X, Heart, ExternalLink } from 'lucide-react';
import { ThemeConfig, Language } from '../types';
import { TRANSLATIONS } from '../translations';

// lucide-react v1 removed brand icons (including `Github`). Inline the
// previous lucide GitHub mark so the icon keeps inheriting `currentColor`
// and the existing sizing API.
const GithubIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C4 2 3 2 3 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 2 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  tConfig: ThemeConfig;
  language: Language;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, tConfig, language }) => {
  if (!isOpen) return null;

  const t = TRANSLATIONS[language];
  const version = __APP_VERSION__;

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
              <GithubIcon size={18} />
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
              <GithubIcon size={16} />
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
