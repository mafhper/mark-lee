import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { THEMES } from '../constants';
import { Theme, ThemeConfig, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface MenuBarProps {
  theme: Theme;
  onAction: (action: string) => void;
  tConfig: ThemeConfig;
  language: Language;
}

interface MenuItem {
  label: string;
  action?: string;
  shortcut?: string;
  separator?: boolean;
  checked?: boolean;
  submenu?: MenuItem[];
}

const MenuBar: React.FC<MenuBarProps> = ({ theme, onAction, tConfig, language }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[language];

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

  const menus: Record<string, MenuItem[]> = {
    [t['file']]: [
      { label: t['file.new'], action: 'file-new', shortcut: 'Alt+N' },
      { label: t['file.open'], action: 'file-open', shortcut: 'Ctrl+O' },
      { separator: true, label: '' },
      { label: t['file.save'], action: 'file-save', shortcut: 'Ctrl+S' },
      { label: t['file.saveAs'], action: 'file-save-as', shortcut: 'Ctrl+Shift+S' },
      { label: t['file.exportPdf'], action: 'file-export-pdf' },
      { separator: true, label: '' },
      { label: t['file.print'], action: 'file-print', shortcut: 'Ctrl+P' },
    ],
    [t['edit']]: [
      { label: t['edit.undo'], action: 'edit-undo', shortcut: 'Ctrl+Z' },
      { label: t['edit.redo'], action: 'edit-redo', shortcut: 'Ctrl+Y' },
      { separator: true, label: '' },
      { label: t['edit.find'], action: 'edit-find', shortcut: 'Ctrl+F' },
      { label: t['edit.replace'], action: 'edit-find', shortcut: 'Ctrl+H' },
    ],
    [t['view']]: [
      { label: t['view.zen'], action: 'view-zen' },
      { label: t['view.toolbar'], action: 'view-toolbar', checked: true },
      { separator: true, label: '' },
      { label: t['view.editor'], action: 'view-editor' },
      { label: t['view.preview'], action: 'view-preview' },
      { label: t['view.split'], action: 'view-split' },
    ],
    [t['settings']]: [
      { label: t['settings.menu'], action: 'settings-pref' },
    ]
  };

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.action) {
      onAction(item.action);
      setActiveMenu(null);
    }
  };

  return (
    <div ref={menuRef} className={`flex px-2 text-xs md:text-sm select-none border-b ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg} bg-opacity-80`}>
      <div className="flex items-center">
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
    </div>
  );
};

export default MenuBar;