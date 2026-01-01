import React, { useState, useEffect, useRef } from 'react';
import { Check, Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Theme, ThemeConfig, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { RecentFile } from '../services/storage';

interface MenuBarProps {
  theme: Theme;
  onAction: (action: string, data?: any) => void;
  tConfig: ThemeConfig;
  language: Language;
  recentFiles?: RecentFile[];
  shortcuts?: Record<string, string>;
  fileName?: string;
  isModified?: boolean;
  isZenMode?: boolean;
}

interface MenuItem {
  label: string;
  action?: string;
  actionData?: any;
  shortcut?: string;
  separator?: boolean;
  checked?: boolean;
  submenu?: MenuItem[];
}

const MenuBar: React.FC<MenuBarProps> = ({ 
  onAction, tConfig, language, recentFiles = [], shortcuts = {},
  fileName, isModified, isZenMode = false
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[language];

  // Helper to get shortcut for action
  const getShortcut = (actionId: string, defaultShortcut?: string) => {
    return shortcuts[actionId] || defaultShortcut;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build recent files submenu
  const recentFilesMenu: MenuItem[] = recentFiles.length > 0 
    ? recentFiles.slice(0, 5).map(f => ({
        label: f.name,
        action: 'file-open-recent',
        actionData: f.path
      }))
    : [{ label: t['file.noRecent'] || 'No recent files', action: '' }];

  const menus: Record<string, MenuItem[]> = {
    [t['file']]: [
      { label: t['file.new'], action: 'file-new', shortcut: getShortcut('file-new', 'Ctrl+N') },
      { label: t['file.open'], action: 'file-open', shortcut: getShortcut('file-open', 'Ctrl+O') },
      { label: t['file.openRecent'] || 'Recent Files', submenu: recentFilesMenu },
      { separator: true, label: '' },
      { label: t['file.save'], action: 'file-save', shortcut: getShortcut('file-save', 'Ctrl+S') },
      { label: t['file.saveAs'], action: 'file-save-as', shortcut: getShortcut('file-save-as', 'Ctrl+Shift+S') },
      { label: t['file.exportPdf'], action: 'file-export-pdf', shortcut: getShortcut('file-export-pdf', 'Ctrl+E') },
      { label: t['file.exportHtml'] || 'Export HTML...', action: 'file-export-html' },
      { label: t['file.exportMdFormatted'] || 'Export Formatted...', action: 'file-export-md-formatted' },
      { label: t['file.exportMdMinified'] || 'Export Minified...', action: 'file-export-md-minified' },
      { separator: true, label: '' },
      { label: t['file.print'], action: 'file-print', shortcut: getShortcut('file-print', 'Ctrl+P') },
      { separator: true, label: '' },
      { label: t['file.exit'], action: 'file-exit', shortcut: 'Alt+F4' },
    ],
    [t['edit']]: [
      { label: t['edit.undo'], action: 'edit-undo', shortcut: getShortcut('edit-undo', 'Ctrl+Z') },
      { label: t['edit.redo'], action: 'edit-redo', shortcut: getShortcut('edit-redo', 'Ctrl+Y') },
      { separator: true, label: '' },
      { label: t['edit.find'], action: 'edit-find', shortcut: getShortcut('edit-find', 'Ctrl+F') },
      { label: t['edit.replace'], action: 'edit-find', shortcut: getShortcut('edit-replace', 'Ctrl+H') },
      { separator: true, label: '' },
      { label: t['edit.snippets'] || 'Insert Snippet...', action: 'edit-snippets' },
    ],
    [t['view']]: [
      { label: t['view.zen'], action: 'view-zen', shortcut: getShortcut('view-zen', 'F10'), checked: isZenMode },
      { label: t['view.toolbar'], action: 'view-toolbar', checked: true, shortcut: getShortcut('view-toolbar', 'Ctrl+T') },
      { separator: true, label: '' },
      { label: t['view.editor'], action: 'view-editor' },
      { label: t['view.preview'], action: 'view-preview' },
      { label: t['view.split'], action: 'view-split' },
    ],
    [t['settings.menu']]: [],  // Empty - clicking directly opens settings
    [t['help'] || 'Help']: [
      { label: t['help.guide'] || 'User Guide', action: 'help-guide' },
      { label: t['help.faq'] || 'Common Issues', action: 'help-faq' },
      { label: t['help.contribute'] || 'How to Help', action: 'help-contribute' },
      { separator: true, label: '' },
      { label: t['help.about'] || 'About', action: 'help-about' },
    ],
  };

  const handleMenuClick = (menuName: string) => {
    // If clicking on Preferences menu (which has no submenu), open settings directly
    if (menuName === t['settings.menu']) {
      onAction('settings-pref');
      setActiveMenu(null);
      return;
    }
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.action) {
      onAction(item.action, item.actionData);
      setActiveMenu(null);
    }
  };

  return (
    <div 
      ref={menuRef} 
      data-tauri-drag-region
      className={`flex justify-between items-center px-2 text-xs md:text-sm select-none border-b ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg} bg-opacity-80 cursor-default`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center relative z-20" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {Object.keys(menus).map((menuName) => (
          <div key={menuName} className="relative">
            <button
              className={`px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${activeMenu === menuName ? 'bg-black/5 dark:bg-white/10' : ''}`}
              onClick={() => handleMenuClick(menuName)}
              onMouseEnter={() => activeMenu && setActiveMenu(menuName)}
            >
              {menuName}
            </button>
            
            {activeMenu === menuName && (
              <div className={`absolute left-0 top-full w-56 py-1 shadow-lg border rounded-b-md z-50 ${tConfig.ui} ${tConfig.uiBorder}`}>
                {menus[menuName].map((item, idx) => (
                  item.separator ? (
                    <div key={idx} className={`h-px my-1 ${tConfig.uiBorder.replace('border', 'bg')} opacity-50`} />
                  ) : item.submenu ? (
                    // Submenu item with nested dropdown
                    <div key={idx} className="relative group/submenu">
                      <button
                        className={`w-full text-left px-4 py-1.5 flex justify-between items-center hover:bg-indigo-500 hover:text-white`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="pl-5">{item.label}</span>
                        </span>
                        <span className="text-[10px] opacity-50">▶</span>
                      </button>
                      {/* Submenu dropdown */}
                      <div className={`absolute left-full top-0 w-56 py-1 shadow-lg border rounded-md z-50 ${tConfig.ui} ${tConfig.uiBorder} hidden group-hover/submenu:block`}>
                        {item.submenu.map((subItem, subIdx) => (
                          <button
                            key={subIdx}
                            className={`w-full text-left px-4 py-1.5 flex justify-between items-center hover:bg-indigo-500 hover:text-white ${!subItem.action ? 'opacity-50 cursor-default' : ''}`}
                            onClick={() => subItem.action && handleItemClick(subItem)}
                            disabled={!subItem.action}
                          >
                            <span className="truncate" title={subItem.actionData || subItem.label}>{subItem.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      key={idx}
                      className={`w-full text-left px-4 py-1.5 flex justify-between items-center hover:bg-indigo-500 hover:text-white group`}
                      onClick={() => handleItemClick(item)}
                    >
                      <span className="flex items-center gap-2">
                         {item.checked && <Check size={12} />}
                         <span className={item.checked ? '' : 'pl-5'}>{item.label}</span>
                      </span>
                      {item.shortcut && (
                        <span className="text-[10px] opacity-50 group-hover:text-white group-hover:opacity-100">{item.shortcut}</span>
                      )}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Center Title - Hidden on small/medium screens to prevent overlap */}
      <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none hidden lg:flex items-center gap-2 z-0">
         {isModified && (
           <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes" />
         )}
         <span className={`font-medium opacity-70 truncate max-w-[200px] lg:max-w-[300px]`}>
           {fileName}{isModified ? '*' : ''}
         </span>
      </div>

      {/* Window Controls */}
      <div className="flex items-center gap-1 relative z-20" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button 
          onClick={() => getCurrentWindow().minimize()}
          className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-60 hover:opacity-100"
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button 
          onClick={() => getCurrentWindow().toggleMaximize()}
          className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-60 hover:opacity-100"
          title="Maximize"
        >
          <Square size={12} />
        </button>
        <button 
          onClick={() => getCurrentWindow().close()}
          className="p-1.5 rounded hover:bg-red-500 hover:text-white transition-colors opacity-60 hover:opacity-100"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default MenuBar;