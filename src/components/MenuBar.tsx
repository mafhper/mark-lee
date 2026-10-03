import React, { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { ThemeConfig, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { RecentFile } from '../services/storage';

/**
 * MKL12B — menu resumido do topo.
 *
 * Este componente antes era uma **titlebar inteira**: trazia os controles de
 * janela (`getCurrentWindow().minimize()` etc.), o título do arquivo no centro e
 * o próprio `data-tauri-drag-region`. Montá-lo criaria uma **segunda titlebar**
 * em cima da `WindowTitleBar` existente — o defeito de drag-region que a MKL12
 * registra como ameaça nº 1.
 *
 * Aqui ficou **só o menu**. Nenhum efeito mora neste arquivo: ele despacha um
 * `MenuActionId` e quem executa é o App. É a regra que a ADR-003 fixa — a barra
 * pertence ao workspace, e o workspace executa.
 *
 * Os ids são os mesmos que o `onKeyDown` do App usa para os atalhos
 * (`file-save`, `view-split`, `fmt-bold`...). Menu e teclado falam uma língua
 * só, e o rótulo do atalho vem de `resolveCommandShortcut`, que já respeita
 * `customShortcuts`.
 */

export type MenuActionId =
  | 'file-new'
  | 'file-open'
  | 'file-open-folder'
  | 'file-open-recent'
  | 'file-save'
  | 'file-save-as'
  | 'file-export'
  | 'edit-undo'
  | 'edit-redo'
  | 'edit-find'
  | 'edit-replace'
  | 'edit-snippets'
  | 'fmt-bold'
  | 'fmt-italic'
  | 'fmt-link'
  | 'fmt-ul'
  | 'fmt-ol'
  | 'fmt-task'
  | 'view-sidebar'
  | 'view-zen'
  | 'view-edit'
  | 'view-split'
  | 'view-preview'
  | 'view-theme-cycle'
  | 'help-shortcuts'
  | 'app-settings'
  | 'window-minimize'
  | 'window-maximize'
  | 'window-close';

interface MenuBarProps {
  tConfig: ThemeConfig;
  language: Language;
  onAction: (action: MenuActionId, payload?: string) => void;
  recentFiles?: RecentFile[];
  shortcuts?: Record<string, string>;
  isZenMode?: boolean;
  sidebarEnabled?: boolean;
  viewMode?: 'edit' | 'split' | 'preview';
}

interface MenuItem {
  label: string;
  action?: MenuActionId;
  payload?: string;
  shortcut?: string;
  separator?: boolean;
  checked?: boolean;
  disabled?: boolean;
  submenu?: MenuItem[];
}

const MenuBar: React.FC<MenuBarProps> = ({
  tConfig,
  language,
  onAction,
  recentFiles = [],
  shortcuts = {},
  isZenMode = false,
  sidebarEnabled = false,
  viewMode = 'edit',
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[language];
  const shortcut = (id: string, fallback: string) => shortcuts[id] || fallback;

  // Fecha ao clicar fora: um menu que não fecha sozinho é um menu que trava a
  // tela sem o usuário perceber por quê.
  useEffect(() => {
    if (!activeMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [activeMenu]);

  const recentItems: MenuItem[] = recentFiles.length
    ? recentFiles.slice(0, 5).map((file) => ({
        label: file.name,
        action: 'file-open-recent',
        payload: file.path,
      }))
    : [{ label: t['file.noRecent'], disabled: true }];

  const menus: Record<string, MenuItem[]> = {
    [t['file']]: [
      { label: t['file.new'], action: 'file-new', shortcut: shortcut('file-new', 'Ctrl+N') },
      { label: t['file.open'], action: 'file-open', shortcut: shortcut('file-open', 'Ctrl+O') },
      {
        label: t['file.openFolder'],
        action: 'file-open-folder',
        shortcut: shortcut('file-open-folder', 'Ctrl+Shift+O'),
      },
      { label: t['file.openRecent'], submenu: recentItems },
      { separator: true, label: '' },
      { label: t['file.save'], action: 'file-save', shortcut: shortcut('file-save', 'Ctrl+S') },
      {
        label: t['file.saveAs'],
        action: 'file-save-as',
        shortcut: shortcut('file-save-as', 'Ctrl+Shift+S'),
      },
      { label: t['file.export'], action: 'file-export', shortcut: shortcut('file-export', 'Ctrl+E') },
    ],
    [t['edit']]: [
      { label: t['edit.undo'], action: 'edit-undo', shortcut: shortcut('edit-undo', 'Ctrl+Z') },
      { label: t['edit.redo'], action: 'edit-redo', shortcut: shortcut('edit-redo', 'Ctrl+Y') },
      { separator: true, label: '' },
      { label: t['edit.find'], action: 'edit-find', shortcut: shortcut('edit-find', 'Ctrl+F') },
      {
        label: t['edit.replace'],
        action: 'edit-replace',
        shortcut: shortcut('edit-replace', 'Ctrl+H'),
      },
      {
        label: t['edit.snippets'],
        action: 'edit-snippets',
        shortcut: shortcut('edit-snippets', 'Ctrl+J'),
      },
    ],
    // "Formatar" é o terceiro menu pedido pelo dono. Sai daqui, e não da barra
    // de ferramentas: a MKL12C decide o que sobe para o topo, e um item de menu
    // que já faz a mesma coisa não pode depender dessa decisão para existir.
    // Rótulos vêm de `tool.*`, as mesmas chaves que a barra de ferramentas já
    // usa. Um item de menu que repete o da barra tem de repetir o rótulo dele —
    // senão a tradução ganha duas palavras para a mesma ação e uma delas erra.
    [t['format']]: [
      { label: t['tool.bold'], action: 'fmt-bold', shortcut: shortcut('fmt-bold', 'Ctrl+Shift+B') },
      { label: t['tool.italic'], action: 'fmt-italic', shortcut: shortcut('fmt-italic', 'Ctrl+I') },
      { label: t['tool.link'], action: 'fmt-link', shortcut: shortcut('fmt-link', 'Ctrl+K') },
      { separator: true, label: '' },
      { label: t['tool.ul'], action: 'fmt-ul', shortcut: shortcut('fmt-ul', 'Ctrl+Shift+8') },
      { label: t['tool.ol'], action: 'fmt-ol', shortcut: shortcut('fmt-ol', 'Ctrl+Shift+7') },
      { label: t['tool.task'], action: 'fmt-task', shortcut: shortcut('fmt-task', 'Ctrl+Shift+9') },
    ],
    [t['view']]: [
      { label: t['view.sidebar'], action: 'view-sidebar', checked: sidebarEnabled, shortcut: shortcut('view-sidebar', 'Ctrl+B') },
      { label: t['view.zen'], action: 'view-zen', checked: isZenMode, shortcut: shortcut('view-zen', 'F10') },
      { separator: true, label: '' },
      { label: t['view.editor'], action: 'view-edit', checked: viewMode === 'edit', shortcut: shortcut('view-edit', 'Ctrl+1') },
      { label: t['view.split'], action: 'view-split', checked: viewMode === 'split', shortcut: shortcut('view-split', 'Ctrl+2') },
      { label: t['view.preview'], action: 'view-preview', checked: viewMode === 'preview', shortcut: shortcut('view-preview', 'Ctrl+3') },
      { separator: true, label: '' },
      {
        label: t['toolbar.theme'],
        action: 'view-theme-cycle',
        shortcut: shortcut('view-theme-cycle', 'Ctrl+Shift+T'),
      },
      { label: t['settings'], action: 'app-settings', shortcut: shortcut('app-settings', 'Ctrl+,') },
    ],
    // "Janela" é o quinto menu pedido pelo dono. Ele não guarda os controles de
    // janela: quem os desenha é a `WindowTitleBar`. O menu apenas dispara as
    // mesmas ações, pelo mesmo caminho do App.
    [t['window']]: [
      { label: t['window.minimize'], action: 'window-minimize' },
      { label: t['window.maximize'], action: 'window-maximize' },
      { separator: true, label: '' },
      { label: t['window.close'], action: 'window-close' },
    ],
  };

  const toggleMenu = (name: string) => setActiveMenu((current) => (current === name ? null : name));

  const run = (item: MenuItem) => {
    if (!item.action || item.disabled) return;
    onAction(item.action, item.payload);
    setActiveMenu(null);
  };

  return (
    <div
      ref={menuRef}
      className={`flex items-center select-none ${tConfig.fg}`}
      role="menubar"
      aria-label={t['file']}
    >
      {Object.keys(menus).map((menuName) => (
        <div key={menuName} className="relative">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={activeMenu === menuName}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeMenu === menuName ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            onClick={() => toggleMenu(menuName)}
            onMouseEnter={() => activeMenu && setActiveMenu(menuName)}
          >
            {menuName}
          </button>

          {activeMenu === menuName && (
            <div
              role="menu"
              className={`absolute left-0 top-full mt-0.5 min-w-56 py-1 shadow-lg border rounded-md z-50 ${tConfig.ui} ${tConfig.uiBorder}`}
            >
              {menus[menuName].map((item, index) =>
                item.separator ? (
                  <div key={index} aria-hidden className="h-px my-1 opacity-30" style={{ backgroundColor: tConfig.fgHex }} />
                ) : item.submenu ? (
                  <div key={index} className="relative group/submenu">
                    <button
                      type="button"
                      className="w-full text-left px-4 py-1.5 flex justify-between items-center hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <span className="flex items-center gap-2">
                        <span>{item.label}</span>
                        <span className="text-[10px] opacity-50">&#9656;</span>
                      </span>
                    </button>
                    <div
                      role="menu"
                      className={`absolute left-full top-0 min-w-56 py-1 shadow-lg border rounded-md z-50 hidden group-hover/submenu:block ${tConfig.ui} ${tConfig.uiBorder}`}
                    >
                      {item.submenu.map((sub, subIndex) => (
                        <button
                          key={subIndex}
                          type="button"
                          role="menuitem"
                          disabled={sub.disabled}
                          className={`w-full text-left px-4 py-1.5 truncate hover:bg-black/5 dark:hover:bg-white/10 ${
                            sub.disabled ? 'opacity-50 cursor-default' : ''
                          }`}
                          title={sub.payload || sub.label}
                          onClick={() => run(sub)}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    key={index}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    className="w-full text-left px-4 py-1.5 flex justify-between items-center gap-6 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-default"
                    onClick={() => run(item)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {item.checked && <Check size={12} className="shrink-0" />}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.shortcut && (
                      <span className="shrink-0 text-[10px] opacity-50 tabular-nums">{item.shortcut}</span>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MenuBar;