import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { ThemeConfig, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { RecentFile } from '../services/storage';
import { iconeDeAcao } from '../app/actions/action-icons';

/**
 * Menu resumido do topo.
 *
 * Este componente antes era uma **titlebar inteira**: trazia os controles de
 * janela (`getCurrentWindow().minimize()` etc.), o título do arquivo no centro e
 * o próprio `data-tauri-drag-region`. Montá-lo criaria uma **segunda titlebar**
 * em cima da `WindowTitleBar` existente — o defeito de drag-region mais conhecido
 * deste cabeçalho.
 *
 * Aqui ficou **só o menu**. Nenhum efeito mora neste arquivo: ele despacha um
 * `MenuActionId` e quem executa é o App. A barra pertence ao workspace, e quem
 * executa é o workspace.
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
  // ile-rename e novo: renomear so existia na interface da barra lateral.
  | 'file-rename'
  | 'edit-undo'
  | 'edit-redo'
  | 'edit-find'
  | 'edit-replace'
  // edit-find-advanced e a busca avancada (o modal); edit-find became o
  // painel simples do editor.
  | 'edit-find-advanced'
  // As duas transformacoes de Markdown, que viviam so na faixa.
  | 'tool-format'
  | 'tool-minify'
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
  // iew-journal substitui o AppModeSwitcher: Memorias vira item de menu.
  | 'view-journal'
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
// Três menus, na ordem do desenho do dono.
    //
    // "Formatar" e "Janela" saíram. **Formatar** porque as seis ações dele são a
    // faixa de formatação da barra, e um item de menu que repete o da barra
    // duplica o rótulo — a tradução passa a ter duas palavras para a mesma ação e
    // uma delas erra. **Janela** porque não guardava os controles: quem os desenha
    // é a `WindowTitleBar` nativa, e o menu apenas repetia as mesmas ações.
    [t['file']]: [
      { label: t['file.new'], action: 'file-new', shortcut: shortcut('file-new', 'Ctrl+N') },
      { label: t['file.open'], action: 'file-open', shortcut: shortcut('file-open', 'Ctrl+O') },
      {
        label: t['file.openFolder'],
        action: 'file-open-folder',
        shortcut: shortcut('file-open-folder', 'Ctrl+Shift+O'),
      },
      { label: t['file.openRecent'], action: 'file-open-recent', submenu: recentItems },
      { separator: true, label: '' },
      { label: t['file.save'], action: 'file-save', shortcut: shortcut('file-save', 'Ctrl+S') },
      {
        label: t['file.saveAs'],
        action: 'file-save-as',
        shortcut: shortcut('file-save-as', 'Ctrl+Shift+S'),
      },
      { label: t['file.export'], action: 'file-export', shortcut: shortcut('file-export', 'Ctrl+E') },
      { label: t['file.rename'], action: 'file-rename' },
    ],
    // "Ações" é o antigo "Editar", renomeado pelo dono: o menu deixou de ser só
    // edição de texto e passou a reunir as ações de manipulação — desfazer, buscar,
    // substituir, trechos, e as duas transformações de Markdown.
    [t['actions']]: [
      { label: t['edit.undo'], action: 'edit-undo', shortcut: shortcut('edit-undo', 'Ctrl+Z') },
      { label: t['edit.redo'], action: 'edit-redo', shortcut: shortcut('edit-redo', 'Ctrl+Y') },
      { separator: true, label: '' },
      // Buscar abre o painel do editor, que é a busca simples. Busca avançada abre
      // o modal, que é a única peça com "substituir todos" e as três opções
      // (maiúscula, palavra inteira, regex). Substituir vai ao painel: é uma ação
      // direta, e o painel já tem a linha de substituição.
      { label: t['edit.find'], action: 'edit-find', shortcut: shortcut('edit-find', 'Ctrl+F') },
      {
        label: t['edit.findAdvanced'],
        action: 'edit-find-advanced',
      },
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
      { separator: true, label: '' },
      // As duas transformações saíram da faixa de formatação e passaram a morar
      // aqui: `tool.formatMarkdown`/`tool.minifyMarkdown` eram as duas únicas ações
      // de Edição que não tinham item de menu.
      { label: t['tool.format'], action: 'tool-format' },
      { label: t['tool.minify'], action: 'tool-minify' },
    ],
    [t['view']]: [
      { label: t['view.sidebar'], action: 'view-sidebar', checked: sidebarEnabled, shortcut: shortcut('view-sidebar', 'Ctrl+B') },
      { separator: true, label: '' },
      { label: t['view.editor'], action: 'view-edit', checked: viewMode === 'edit', shortcut: shortcut('view-edit', 'Ctrl+1') },
      { label: t['view.split'], action: 'view-split', checked: viewMode === 'split', shortcut: shortcut('view-split', 'Ctrl+2') },
      { label: t['view.preview'], action: 'view-preview', checked: viewMode === 'preview', shortcut: shortcut('view-preview', 'Ctrl+3') },
      { label: t['view.zen'], action: 'view-zen', checked: isZenMode, shortcut: shortcut('view-zen', 'F10') },
      { separator: true, label: '' },
      // Memórias entra no menu: era o `AppModeSwitcher`, um controle fora de
      // qualquer menu, e o desenho do dono a colocava aqui.
      { label: t['view.journal'], action: 'view-journal' },
      { separator: true, label: '' },
      {
        label: t['toolbar.theme'],
        action: 'view-theme-cycle',
        shortcut: shortcut('view-theme-cycle', 'Ctrl+Shift+T'),
      },
      { label: t['settings'], action: 'app-settings', shortcut: shortcut('app-settings', 'Ctrl+,') },
    ],
  };

  const toggleMenu = (name: string) => setActiveMenu((current) => (current === name ? null : name));

  const run = (item: MenuItem) => {
    if (!item.action || item.disabled) return;
    onAction(item.action, item.payload);
    setActiveMenu(null);
  };

  return (
    // `min-w-0 shrink` e `shrink-0` nos itens: o menu divide a linha do header
    // com a barra, e numa janela estreita quem tem de ceder é ele — o
    // logo e cada rótulo de menu são insubstituíveis, a barra tem `min-w`.
    // Sem `shrink`, o menu ficava nos 341px do conteúdo, logo(128) + menu(341)
    // estouravam a viewport e a barra recebia 0px.
    <div
      ref={menuRef}
      className={`flex items-center select-none min-w-0 shrink ${tConfig.fg}`}
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
            /* `no-drag` em cada botão, e não no container.

               O container herda `drag` do header, e é isso que faz o **espaço
               entre os menus** — a outra região livre da linha de topo — arrastar
               a janela. O botão é o inverso: é clicável, e um `drag` herdado
               sobre ele faz o clique e o gesto disputarem o mesmo pixel. */

            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeMenu === menuName ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            onClick={() => toggleMenu(menuName)}
            onMouseEnter={() => activeMenu && setActiveMenu(menuName)}
          >
            {menuName}
          </button>

{activeMenu === menuName && (
            /* `z-[400]`, e não `z-50`.

               O dono viu o menu **passando por cima** da faixa de busca e do
               número da linha. A causa é aritmética de empilhamento, não de
               layout: `.cm-panels` da biblioteca é `sticky` com `z-index: 300`
               — e `50` perde para `300` sempre. Como o painel é `sticky`, ele
               ainda participates do empilhamento do editor, que é um contexto
               diferente do do menu, e o navegador resolve a favor de quem tem
               o número maior.

               O `400` é deliberadamente **maior que 300**: é o valor que a
               biblioteca escolhe, não um que a gente inventou. Se algum dia a
               biblioteca subir, é este número que tem de acompanhá-lo — e o
               teste abaixo é o que avisa. */
            <div
              role="menu"
              className={`absolute left-0 top-full mt-0.5 min-w-56 py-1 shadow-lg border rounded-md z-[400] ${tConfig.ui} ${tConfig.uiBorder}`}
            >
              {menus[menuName].map((item, index) =>
                item.separator ? (
                  <div key={index} aria-hidden className="h-px my-1 opacity-30" style={{ backgroundColor: tConfig.fgHex }} />
                ) : item.submenu ? (
                  <div key={index} className="relative group/submenu">
                    <button
                      type="button"
                      role="menuitem"
                      aria-haspopup="menu"
                      className="w-full text-left px-4 py-1.5 flex justify-between items-center gap-6 hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex w-4 h-4 shrink-0 items-center justify-center" aria-hidden>
                          {iconeDeAcao(item.action)}
                        </span>
                        {/* A calha do check, **vazia**.

                           O item comum tem duas calhas de largura fixa — a do
                           ícone e a do check — e o rótulo nasce depois das duas.
                           Este item tinha só a primeira, e a consequência é
                           aritmética: 16px da calha que faltou mais os 8px do
                           `gap` que deixou de existir. Medido, o rótulo de
                           "Recentes" nascia em x=41 e todos os outros em x=65.

                           A calha vazia não é um elemento morto: é o que impede
                           que este rótulo dance em relação aos outros quando
                           algum item passa a ter `checked`. É a mesma razão que
                           o comentário do item comum já registrava, e o item de
                           submenu simplesmente não recebeu a calha. */}
                        <span className="inline-flex w-4 h-4 shrink-0 items-center justify-center" aria-hidden />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {/* A afordância vai na **mesma coluna** dos atalhos, e é o
                         que a captura mostrou faltando: o chevron estava dentro
                         do grupo do rótulo, colado em "Recentes" e a meio caminho
                         da linha, enquanto `Ctrl+N` encostava na margem. Agora
                         ambos terminam em x=229.

                         E o `ChevronRight` substitui o `&#9656;`: o resto da tela
                         usa lucide, e um glifo de outra fonte ao lado de ícones da
                         mesma família é o tipo de diferença que só aparece quando
                         alguém olha. */}
                      <ChevronRight size={12} aria-hidden className="shrink-0 opacity-50" />
                    </button>
                    {/* `group-focus-within` além do `group-hover`: o submenu é um
                        `<div>` sem `tabindex`, então ele não recebe foco — mas o
                        botão que o abre recebe, e `focus-within` sobe até ele.
                        Sem isso o item era **inalcançável pelo teclado**: dava para
                        Tab até "Recentes" e nada acontecia, porque só o mouse
                        abria o submenu. Uma classe resolve e não custa JS. */}
                    <div
                      role="menu"
                      className={`absolute left-full top-0 min-w-56 py-1 shadow-lg border rounded-md z-[400] hidden group-hover/submenu:block group-focus-within/submenu:block ${tConfig.ui} ${tConfig.uiBorder}`}
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
                          <span className="flex items-center gap-2 min-w-0">
                              {/* A calha do ícone é sempre a mesma — 16px, mesmo
                                  quando não há glifo. Sem ela, o item sem ícone
                                  puxa o rótulo 24px para a esquerda dos outros, e
                                  a linha de "Nenhum arquivo recente" ficava
                                  desalinhada de todos os itens com arquivo. A
                                  ausência de ícone é um estado da linha, e um
                                  estado não pode mudar a geometria da lista. */}
                              <span className="inline-flex w-4 h-4 shrink-0 items-center justify-center" aria-hidden>
                                {sub.action ? iconeDeAcao(sub.action === 'file-open-recent' ? 'file-open' : sub.action) : null}
                              </span>
                              {/* Recentes usam a ação `file-open-recent` para
                                  carregar o caminho, mas o desenho é o de
                                  *abrir arquivo*: um relógio em cada linha
                                  repetiria a mesma imagem cinco vezes e não
                                  diria nada. */}
                              <span className="truncate">{sub.label}</span>
                            </span>
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
                      {/* Duas calhas de largura fixa: o ícone à esquerda e o check
                          ao lado. Se o check dividisse a calha do ícone, **marcar o
                          item empurraria o rótulo** — e um menu que dança ao passar
                          o mouse por cima não é um menu, é um efeito. O critério
                          de aceite é a posição do rótulo com e sem `checked`. */}
                      <span className="inline-flex w-4 h-4 shrink-0 items-center justify-center" aria-hidden>
                        {iconeDeAcao(item.action)}
                      </span>
                      <span className="inline-flex w-4 h-4 shrink-0 items-center justify-center">
                        {item.checked && <Check size={12} className="shrink-0" />}
                      </span>
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