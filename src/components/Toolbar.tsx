import React, { useState } from 'react';
import { 
  Bold, Italic, Heading1, Heading2, Quote, Code, 
  Link as LinkIcon, Image as ImageIcon, List, ListOrdered, 
  CheckSquare, Columns, Maximize, Eye, Sun, Moon, Monitor, Coffee
} from 'lucide-react';
import { EditorAction, Theme, ThemeConfig, ViewMode, Language } from '../types';
import { THEMES } from '../constants';
import { TRANSLATIONS } from '../translations';

interface ToolbarProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  onAction: (action: EditorAction) => void;
  language: Language;
  fileName: string;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  theme, 
  setTheme, 
  viewMode, 
  setViewMode, 
  onAction,
  language,
  fileName
}) => {
  const tConfig = THEMES[theme];
  const [showThemes, setShowThemes] = useState(false);
  const t = TRANSLATIONS[language];

  const IconButton = ({ 
    icon: Icon, 
    onClick, 
    active = false,
    title 
  }: { 
    icon: React.ElementType, 
    onClick: () => void, 
    active?: boolean,
    title?: string
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-all duration-200 ${
        active 
          ? 'bg-indigo-500/20 text-indigo-500' 
          : `${tConfig.fg} hover:bg-black/5 dark:hover:bg-white/10 opacity-60 hover:opacity-100`
      }`}
    >
      <Icon size={16} />
    </button>
  );

  const Divider = () => (
    <div className={`w-px h-5 mx-1 ${tConfig.uiBorder.replace('border', 'bg')} opacity-50`} />
  );

  return (
    <div className={`h-12 border-b flex items-center justify-between px-3 select-none ${tConfig.ui} ${tConfig.uiBorder} bg-opacity-80`}>
      <div className="flex items-center space-x-0.5">
        <div className="mr-4 flex items-center gap-2">
            {/* Mark-Lee Logo */}
            <div className="w-6 h-6 rounded bg-gradient-to-b from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                 <polyline points="4 7 4 17 10 12 16 17 16 7" />
               </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className={`text-[10px] font-bold opacity-50 uppercase ${tConfig.fg} tracking-wider`}>MARK-LEE</span>
              <span className={`text-sm font-medium ${tConfig.fg} max-w-[150px] truncate`}>{fileName}</span>
            </div>
        </div>

        <Divider />
        
        <IconButton icon={Bold} onClick={() => onAction('bold')} title={`${t['tool.bold']} (Ctrl+B)`} />
        <IconButton icon={Italic} onClick={() => onAction('italic')} title={`${t['tool.italic']} (Ctrl+I)`} />
        <IconButton icon={Code} onClick={() => onAction('code')} title={t['tool.code']} />
        
        <Divider />
        
        <IconButton icon={Heading1} onClick={() => onAction('h1')} title={t['tool.h1']} />
        <IconButton icon={Heading2} onClick={() => onAction('h2')} title={t['tool.h2']} />
        <IconButton icon={Quote} onClick={() => onAction('quote')} title={t['tool.quote']} />
        
        <Divider />
        
        <IconButton icon={LinkIcon} onClick={() => onAction('link')} title={t['tool.link']} />
        <IconButton icon={ImageIcon} onClick={() => onAction('image')} title={t['tool.image']} />
        
        <Divider />
        
        <IconButton icon={List} onClick={() => onAction('list-ul')} title={t['tool.ul']} />
        <IconButton icon={ListOrdered} onClick={() => onAction('list-ol')} title={t['tool.ol']} />
        <IconButton icon={CheckSquare} onClick={() => onAction('check')} title={t['tool.task']} />
      </div>

      <div className="flex items-center space-x-3">
        
        {/* View Mode Switcher */}
        <div className={`flex rounded bg-black/5 dark:bg-white/5 p-0.5`}>
          <button 
            onClick={() => setViewMode('edit')}
            className={`p-1.5 rounded-sm transition-all ${viewMode === 'edit' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-500' : `${tConfig.fg} opacity-50 hover:opacity-100`}`}
            title={t['view.editor']}
          >
            <Maximize size={14} />
          </button>
          <button 
            onClick={() => setViewMode('split')}
            className={`p-1.5 rounded-sm transition-all ${viewMode === 'split' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-500' : `${tConfig.fg} opacity-50 hover:opacity-100`}`}
            title={t['view.split']}
          >
            <Columns size={14} />
          </button>
          <button 
            onClick={() => setViewMode('preview')}
            className={`p-1.5 rounded-sm transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-500' : `${tConfig.fg} opacity-50 hover:opacity-100`}`}
            title={t['view.preview']}
          >
            <Eye size={14} />
          </button>
        </div>

        {/* Theme Toggler */}
        <div className="relative">
          <button 
            onClick={() => setShowThemes(!showThemes)}
            className={`p-1.5 rounded-md ${tConfig.fg} hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100`}
            title="Switch Theme"
          >
            {theme === Theme.Light ? <Sun size={18} /> : 
             theme === Theme.Dark ? <Moon size={18} /> :
             theme === Theme.Sepia ? <Coffee size={18} /> :
             <Monitor size={18} />}
          </button>

          {showThemes && (
            <div className={`absolute right-0 top-full mt-2 w-40 rounded-lg border shadow-xl overflow-hidden z-50 ${tConfig.ui} ${tConfig.uiBorder}`}>
              <div className={`px-3 py-2 text-xs font-semibold opacity-50 ${tConfig.fg}`}>THEME</div>
              {[
                { t: Theme.Light, label: t['theme.light'], icon: Sun },
                { t: Theme.Dark, label: t['theme.dark'], icon: Moon },
                { t: Theme.Midnight, label: t['theme.midnight'], icon: Monitor },
                { t: Theme.Sepia, label: t['theme.sepia'], icon: Coffee },
              ].map((item) => (
                <button
                  key={item.t}
                  onClick={() => { setTheme(item.t); setShowThemes(false); }}
                  className={`flex items-center w-full px-4 py-2 text-sm text-left gap-3 hover:opacity-100 transition-colors ${
                    theme === item.t ? 'bg-indigo-500/10 text-indigo-500 font-medium' : `${tConfig.fg} hover:bg-black/5 dark:hover:bg-white/5 opacity-80`
                  }`}
                >
                  <item.icon size={14} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;