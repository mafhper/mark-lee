import React, { useState } from 'react';
import { 
  Bold, Italic, Heading1, Heading2, Quote, Code, 
  Link as LinkIcon, Image as ImageIcon, List, ListOrdered, 
  CheckSquare, Columns, Maximize, Eye, Sun, Moon, Monitor, Coffee,
  ArrowLeftRight, Terminal, Snowflake, Zap, Leaf, Focus, 
  PanelTop, PanelBottom, PanelLeft, PanelRight
} from 'lucide-react';
import { EditorAction, Theme, ViewMode, Language, AppSettings } from '../types';
import { THEMES } from '../constants';
import { TRANSLATIONS } from '../translations';

interface ToolbarProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  onAction: (action: EditorAction) => void;
  onMenuAction?: (action: string) => void;
  language: Language;
  fileName: string;
  isModified?: boolean;
  isZenMode?: boolean;
  onSwapSides: () => void;
  orientation?: 'horizontal' | 'vertical';
  toolbarPosition?: 'top' | 'bottom' | 'left' | 'right';
  onPositionChange?: (position: 'top' | 'bottom' | 'left' | 'right') => void;
  toolbarItems?: AppSettings['toolbarItems'];
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  theme, 
  setTheme, 
  viewMode, 
  setViewMode, 
  onAction,
  onMenuAction,
  language,
  isZenMode = false,
  onSwapSides,
  orientation = 'horizontal',
  toolbarPosition = 'top',
  onPositionChange,
  toolbarItems
}) => {
  const tConfig = THEMES[theme];
  const [showThemes, setShowThemes] = useState(false);
  const [showPositionMenu, setShowPositionMenu] = useState(false);
  const t = TRANSLATIONS[language];
  const isVertical = orientation === 'vertical';

  // Default all items to visible if not specified
  const items = {
    bold: toolbarItems?.bold ?? true,
    italic: toolbarItems?.italic ?? true,
    code: toolbarItems?.code ?? true,
    headers: toolbarItems?.headers ?? true,
    quote: toolbarItems?.quote ?? true,
    link: toolbarItems?.link ?? true,
    image: toolbarItems?.image ?? true,
    lists: toolbarItems?.lists ?? true,
    viewModes: toolbarItems?.viewModes ?? true,
    themes: toolbarItems?.themes ?? true,
    zenMode: toolbarItems?.zenMode ?? false, // Hidden by default
    positionSelector: toolbarItems?.positionSelector ?? false, // Hidden by default
  };

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
    <div className={`${isVertical ? 'w-5 h-px my-1' : 'w-px h-5 mx-1'} ${tConfig.uiBorder.replace('border', 'bg')} opacity-50`} />
  );

  const positionIcons = {
    top: PanelTop,
    bottom: PanelBottom,
    left: PanelLeft,
    right: PanelRight,
  };

  const CurrentPositionIcon = positionIcons[toolbarPosition];

  return (
    <div 
      data-tauri-drag-region 
      className={`
        ${isVertical ? 'w-12 h-full flex-col py-3 border-r' : 'h-12 border-b flex-row px-3 items-center'}
        flex justify-between select-none relative ${tConfig.ui} ${tConfig.uiBorder} bg-opacity-80
      `}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Group 1: Logo + Core Tools */}
      <div className={`flex ${isVertical ? 'flex-col items-center space-y-2' : 'flex-row items-center space-x-0.5'}`} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <img 
          src={theme === Theme.Light || theme === Theme.Sepia ? '/favicon.svg' : '/favicon-dark.svg'} 
          alt="Mark-Lee" 
          className={`w-5 h-5 rounded-full shadow-sm ${isVertical ? 'mb-3' : 'mr-2'}`}
        />

        {!isVertical && <Divider />}
        
        {/* Formatting Tools */}
        {items.bold && <IconButton icon={Bold} onClick={() => onAction('bold')} title={`${t['tool.bold']} (Ctrl+B)`} />}
        {items.italic && <IconButton icon={Italic} onClick={() => onAction('italic')} title={`${t['tool.italic']} (Ctrl+I)`} />}
        {items.code && <IconButton icon={Code} onClick={() => onAction('code')} title={t['tool.code']} />}
        
        {(items.bold || items.italic || items.code) && (items.headers || items.quote) && <Divider />}
        
        {items.headers && (
          <>
            <IconButton icon={Heading1} onClick={() => onAction('h1')} title={t['tool.h1']} />
            <IconButton icon={Heading2} onClick={() => onAction('h2')} title={t['tool.h2']} />
          </>
        )}
        {items.quote && <IconButton icon={Quote} onClick={() => onAction('quote')} title={t['tool.quote']} />}
        
        {(items.headers || items.quote) && (items.link || items.image) && <Divider />}
        
        {items.link && <IconButton icon={LinkIcon} onClick={() => onAction('link')} title={t['tool.link']} />}
        {items.image && <IconButton icon={ImageIcon} onClick={() => onAction('image')} title={t['tool.image']} />}
        
        {(items.link || items.image) && items.lists && <Divider />}
        
        {items.lists && (
          <>
            <IconButton icon={List} onClick={() => onAction('list-ul')} title={t['tool.ul']} />
            <IconButton icon={ListOrdered} onClick={() => onAction('list-ol')} title={t['tool.ol']} />
            <IconButton icon={CheckSquare} onClick={() => onAction('check')} title={t['tool.task']} />
          </>
        )}
      </div>

      {/* Right side: View modes + Theme + Zen + Position */}
      <div className={`flex ${isVertical ? 'flex-col items-center space-y-3' : 'flex-row items-center space-x-3'}`} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        
        {/* View Mode Switcher */}
        {items.viewModes && (
          <div className={`flex rounded-md p-0.5 gap-0.5 ${isVertical ? 'flex-col' : 'flex-row'}`}>
            <button 
              onClick={() => setViewMode('edit')}
              className={`p-1.5 rounded transition-all ${viewMode === 'edit' ? `${tConfig.fg} opacity-100 bg-black/10 dark:bg-white/10` : `${tConfig.fg} opacity-40 hover:opacity-70 hover:bg-black/5 dark:hover:bg-white/5`}`}
              title={t['view.editor']}
            >
              <Maximize size={14} />
            </button>
            <button 
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded transition-all ${viewMode === 'split' ? `${tConfig.fg} opacity-100 bg-black/10 dark:bg-white/10` : `${tConfig.fg} opacity-40 hover:opacity-70 hover:bg-black/5 dark:hover:bg-white/5`}`}
              title={t['view.split']}
            >
              <Columns size={14} />
            </button>
            <button 
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded transition-all ${viewMode === 'preview' ? `${tConfig.fg} opacity-100 bg-black/10 dark:bg-white/10` : `${tConfig.fg} opacity-40 hover:opacity-70 hover:bg-black/5 dark:hover:bg-white/5`}`}
              title={t['view.preview']}
            >
              <Eye size={14} />
            </button>
            {viewMode === 'split' && (
              <button 
                onClick={onSwapSides}
                className={`p-1.5 rounded transition-all ${tConfig.fg} opacity-40 hover:opacity-70 hover:bg-black/5 dark:hover:bg-white/5 ${isVertical ? 'mt-0.5' : 'ml-0.5'}`}
                title="Swap Sides"
              >
                <ArrowLeftRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* Zen Mode Toggle */}
        {items.zenMode && onMenuAction && (
          <IconButton 
            icon={Focus} 
            onClick={() => onMenuAction('view-zen')} 
            active={isZenMode}
            title={`${t['view.zen']} (F10)`} 
          />
        )}

        {/* Position Selector */}
        {items.positionSelector && onPositionChange && (
          <div className="relative">
            <button 
              onClick={() => setShowPositionMenu(!showPositionMenu)}
              className={`p-1.5 rounded-md ${tConfig.fg} hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100`}
              title={t['settings.toolbarPosition'] || 'Toolbar Position'}
            >
              <CurrentPositionIcon size={16} />
            </button>

            {showPositionMenu && (
              <div className={`absolute ${isVertical ? 'left-full bottom-0 ml-2' : toolbarPosition === 'bottom' ? 'right-0 bottom-full mb-2' : 'right-0 top-full mt-2'} w-36 rounded-lg border shadow-xl overflow-hidden z-50 ${tConfig.ui} ${tConfig.uiBorder}`}>
                <div className={`px-3 py-2 text-xs font-semibold opacity-50 ${tConfig.fg}`}>
                  {t['settings.toolbarPosition'] || 'POSITION'}
                </div>
                {(['top', 'bottom', 'left', 'right'] as const).map((pos) => {
                  const PosIcon = positionIcons[pos];
                  return (
                    <button
                      key={pos}
                      onClick={() => { onPositionChange(pos); setShowPositionMenu(false); }}
                      className={`flex items-center w-full px-4 py-2 text-sm text-left gap-3 transition-colors ${
                        toolbarPosition === pos 
                          ? 'bg-indigo-500/10 text-indigo-500 font-medium' 
                          : `${tConfig.fg} hover:bg-black/5 dark:hover:bg-white/5 opacity-80`
                      }`}
                    >
                      <PosIcon size={14} />
                      {pos.charAt(0).toUpperCase() + pos.slice(1)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Theme Toggler */}
        {items.themes && (
          <div className="relative">
            <button 
              onClick={() => setShowThemes(!showThemes)}
              className={`p-1.5 rounded-md ${tConfig.fg} hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100`}
              title="Switch Theme"
            >
              {theme === Theme.Light ? <Sun size={18} /> : 
               theme === Theme.Dark ? <Moon size={18} /> :
               theme === Theme.Sepia ? <Coffee size={18} /> :
               theme === Theme.Nord ? <Snowflake size={18} /> :
               theme === Theme.Synthwave ? <Zap size={18} /> :
               theme === Theme.Forest ? <Leaf size={18} /> :
               theme === Theme.Coffee ? <Coffee size={18} /> :
               theme === Theme.Terminal ? <Terminal size={18} /> :
               <Monitor size={18} />}
            </button>

            {showThemes && (
              <div className={`absolute ${isVertical ? 'left-full bottom-0 ml-2' : toolbarPosition === 'bottom' ? 'right-0 bottom-full mb-2' : 'right-0 top-full mt-2'} w-40 rounded-lg border shadow-xl overflow-hidden z-50 ${tConfig.ui} ${tConfig.uiBorder}`}>
                <div className={`px-3 py-2 text-xs font-semibold opacity-50 ${tConfig.fg}`}>THEME</div>
                {[
                  { t: Theme.Light, label: t['theme.light'], icon: Sun },
                  { t: Theme.Dark, label: t['theme.dark'], icon: Moon },
                  { t: Theme.Midnight, label: t['theme.midnight'], icon: Monitor },
                  { t: Theme.Sepia, label: t['theme.sepia'], icon: Coffee },
                  { t: Theme.Nord, label: t['theme.nord'], icon: Snowflake },
                  { t: Theme.Synthwave, label: t['theme.synthwave'], icon: Zap },
                  { t: Theme.Forest, label: t['theme.forest'], icon: Leaf },
                  { t: Theme.Coffee, label: t['theme.coffee'], icon: Coffee },
                  { t: Theme.Terminal, label: t['theme.terminal'], icon: Terminal },
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
        )}
      </div>
    </div>
  );
};
export default Toolbar;