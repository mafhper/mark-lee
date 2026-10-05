import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BetweenHorizontalStart,
  Check,
  ChevronDown,
  ChevronRight,
  Command,
  CopyPlus,
  Keyboard,
  Layers3,
  Palette,
  RotateCcw,
  Settings2,
  Search,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { createDefaultThemeLibrary } from "../../constants";
import { createPublicationPreset } from "../../services/publication-style";
import {
  AppSettings,
  Language,
  PublicationPreset,
  Theme,
  ThemeConfig,
  ThemeDefinition,
} from "../../types";

export type SettingsTabId =
  | "general"
  | "appearance"
  | "editor"
  | "toolbar"
  | "palette"
  | "presets"
  | "shortcuts";

/* Um controle é um **dado**, e não JSX.

   Esta é a quinta leva do MKL16, e a virada que sustenta todas as outras. Antes,
   `renderSectionCard` recebia conteúdo opaco (`<node/>`), e duas coisas que
   deveriam ser automáticas eram feitas à mão:

   - a busca filtrava `title + description` da seção, então **o nome do controle
     não entrava na comparação**. Medido: de 13 nomes de controle testados, **10
     não eram encontrados** — "Sidebar", "Abas", "Pasta de dados", "Otimizar para
     WebP" todos cegos. A busca ficou "fraca por não achar" e a causa é
     estrutural: os rótulos estavam dentro de uma árvore que a busca não
     percorre.
   - o agrupamento era manual, porque não havia como perguntar "esta seção tem
     quantos itens?" sem contar `<div>` no meio do JSX.

   Declarado como array, as duas viram consequência: a busca percorre
   `groups[].fields[].label` — **o mesmo array que desenha a tela**, então não
   há segunda lista para divergir — e a regra do grupo de seção vira
   `fields.length > 1`, que é uma linha.

   `hint` é a segunda linha do campo, e tem uma regra testável: **só existe se
   apagar a linha não perder um fato.** Três exemplos do inventário medido:
   - "Unidades" encolhe o select para "Métrico"/"Imperial" e a segunda linha vira
     `km, °C, kg` — a informação sai do `<option>`, que ocupava 190px, e vai
     para onde há espaço.
   - "Abas" mantém "Mantém documentos abertos numa trilha previsível" — é fato.
   - "Sidebar" **perde** a sua: "Mostra workspace, busca e ações locais" repetia
     o nome do campo, e o nome da seção que o continha ("Workspace") já sumiu.

   `path` carrega `value` à parte de `hint` porque o valor **é** o dado — um
   caminho de pasta não é explicação, é o que está configurado. */
type FieldOption = { value: string; label: string };

type Field =
  | { kind: "switch"; id: string; label: string; hint?: string; checked: boolean; onChange: (next: boolean) => void }
  | { kind: "select"; id: string; label: string; hint?: string; options: FieldOption[]; value: string; onChange: (next: string) => void }
  | { kind: "range"; id: string; label: string; hint?: string; min: number; max: number; step: number; value: number; unit?: string; onChange: (next: number) => void }
  | { kind: "number"; id: string; label: string; hint?: string; min: number; max: number; step: number; value: number; onChange: (next: number) => void }
  | { kind: "color"; id: string; label: string; value: string; onChange: (next: string) => void }
  | { kind: "shortcut"; id: string; label: string; value: string; placeholder: string; onCapture: (event: React.KeyboardEvent<HTMLInputElement>) => void }
  | { kind: "path"; id: string; label: string; value: string; action: string; onAction: () => void }
  | { kind: "custom"; id: string; label: string; node: React.ReactNode };

/* `id` é um slug estável, e não o texto do título. A chave antiga era
   ``sec-${title}``, com `title` sendo a saída de `tr()` — trocar de idioma
   zerava todos os grupos recolhidos, e renomear uma seção também. Aqui o texto
   pode mudar e o idioma pode mudar; a chave não. */
type FieldGroup = { id: string; title: string; fields: Field[] };

type SettingsPanelProps = {
  open: boolean;
  settings: AppSettings;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  publicationPresets: PublicationPreset[];
  initialTab?: SettingsTabId;
  focusTarget?: string | null;
  onClose: () => void;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  onPublicationPresetsChange: React.Dispatch<React.SetStateAction<PublicationPreset[]>>;
  onJournalFolderSelected?: (path: string) => void;
};

const tabs: Array<{ id: SettingsTabId; icon: React.ReactNode }> = [
  { id: "general", icon: <Settings2 className="h-4 w-4" /> },
  { id: "appearance", icon: <Palette className="h-4 w-4" /> },
  { id: "editor", icon: <Type className="h-4 w-4" /> },
  { id: "toolbar", icon: <BetweenHorizontalStart className="h-4 w-4" /> },
  { id: "palette", icon: <Command className="h-4 w-4" /> },
  { id: "presets", icon: <Layers3 className="h-4 w-4" /> },
  { id: "shortcuts", icon: <Keyboard className="h-4 w-4" /> },
];

const languages: Language[] = ["pt-BR", "en-US", "es-ES"];

const shortcutActionIds = [
  "file-save",
  "file-open",
  "file-open-folder",
  "edit-find",
  "edit-snippets",
  "app-command-palette",
  "app-settings",
  "fmt-bold",
  "fmt-italic",
  "fmt-link",
] as const;

const toolbarItemsBySection: Array<{
  titleKey: "files" | "system" | "editing";
  items: Array<{ key: keyof AppSettings["toolbarItems"]; labelKey: string }>;
}> = [
  {
    titleKey: "files",
    items: [
      { key: "fileNew", labelKey: "new" },
      { key: "fileOpen", labelKey: "open" },
      { key: "fileOpenFolder", labelKey: "openFolder" },
      { key: "fileSave", labelKey: "save" },
      { key: "fileExport", labelKey: "export" },
    ],
  },
  {
    titleKey: "system",
    items: [
      { key: "sysFind", labelKey: "find" },
      { key: "sysSnippets", labelKey: "snippets" },
      { key: "sysTheme", labelKey: "theme" },
      { key: "sysSidebar", labelKey: "sidebar" },
      { key: "sysEdit", labelKey: "editor" },
      { key: "sysSplit", labelKey: "split" },
      { key: "sysPreview", labelKey: "preview" },
      { key: "sysZen", labelKey: "zen" },
      { key: "sysSettings", labelKey: "settings" },
      { key: "sysFormatMarkdown", labelKey: "formatMarkdown" },
      { key: "sysMinifyMarkdown", labelKey: "minifyMarkdown" },
    ],
  },
  {
    titleKey: "editing",
    items: [
      { key: "editBold", labelKey: "bold" },
      { key: "editItalic", labelKey: "italic" },
      { key: "editCode", labelKey: "code" },
      { key: "editLink", labelKey: "link" },
      { key: "editImage", labelKey: "image" },
      { key: "editUL", labelKey: "list" },
      { key: "editOL", labelKey: "orderedList" },
      { key: "editTask", labelKey: "task" },
    ],
  },
];

function normalizeHex(value: string, fallback: string) {
  const clean = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean
      .split("")
      .map((part) => `${part}${part}`)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean.toLowerCase()}`;
  }
  return fallback;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex, "#000000").replace("#", "");
  const intValue = Number.parseInt(normalized, 16);
  if (Number.isNaN(intValue)) return null;
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
}

function luminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  if (l1 == null || l2 == null) return 0;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getBuiltInTheme(themeId: string) {
  return createDefaultThemeLibrary().find((theme) => theme.id === themeId) ?? null;
}

function getThemeName(theme: ThemeDefinition, t: Record<string, string>) {
  const lookupId = theme.baseThemeId ?? theme.id;
  return theme.builtIn ? t[`theme.${lookupId}`] ?? theme.name : theme.name;
}

function describeTheme(theme: ThemeDefinition) {
  const contrast = contrastRatio(theme.config.fgHex, theme.config.bgHex).toFixed(1);
  return {
    contrast,
    shellDelta: Math.abs((luminance(theme.config.bgHex) ?? 0) - (luminance(theme.config.uiHex) ?? 0)),
    accentContrast: contrastRatio(theme.config.accentHex, theme.config.bgHex).toFixed(1),
  };
}

export default function SettingsPanel({
  open,
  settings,
  t,
  tConfig,
  publicationPresets,
  initialTab,
  focusTarget,
  onClose,
  onSettingsChange,
  onPublicationPresetsChange,
  onJournalFolderSelected,
}: SettingsPanelProps) {
  /* Não há mais aba ativa — há **categoria em leitura**, que vem do scroll.

     O estado existia como `activeTab` e era atualizado pelo clique na coluna. O
     clique agora **rola** (não troca estado), e quem muda o estado é o scroll. O
     nome antigo mentiria sobre o que ele representa, e um nome que mente é um
     nome que o próximo leitor usa errado. */
  const [categoriaVisivel, setCategoriaVisivel] = useState<SettingsTabId>("general");
  // Seções fechadas, por sessão. Ver `renderSectionCard`: o estado vai na
  // memória porque fechar uma seção é uma preferência de leitura, não uma
  // configuração do programa.
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  /* Grupos de campos fechados, com a mesma razão — e com uma chave melhor.
     `collapsedSections` guarda `sec-${título}`, e `título` é a saída de `tr()`:
     trocar de idioma zerava tudo. Aqui a chave é o `id` estável do grupo. */
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [busca, setBusca] = useState("");
  const [expandedPresetIds, setExpandedPresetIds] = useState<string[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState(settings.theme);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  /* A ordem de leitura do documento vem de `tabs`, e é a mesma que o menu da
     esquerda percorre: documento e menu não podem divergir, e ser a mesma lista
     é o que garante isso. */
  const ordemDeLeitura = useMemo<SettingsTabId[]>(() => tabs.map((tab) => tab.id), [tabs]);

  /* Rolagem por âncora. `behavior` é parâmetro porque abrir a tela precisa ser
     imediato (`auto`) e o clique precisa ser visível (`smooth`). */
  const rolarParaCategoria = useCallback((id: SettingsTabId, behavior: ScrollBehavior = "smooth") => {
    const alvo = contentScrollRef.current?.querySelector<HTMLElement>(`#cat-${id}`);
    if (!alvo) return;
    alvo.scrollIntoView({ block: "start", behavior });
    setCategoriaVisivel(id);
  }, []);

  /* Scroll-spy: a coluna da esquerda acompanha a rolagem.

     O critério é a **última** categoria cujo topo passou do limite, e não a
     primeira visível: com a primeira, uma categoria alta ocupa a tela inteira e a
     coluna fica presa nela enquanto o usuário lê o resto — que é exatamente
     quando a coluna precisa mudar.

     `requestAnimationFrame` agrupa as chamadas: o `scroll` dispara dezenas de
     vezes por gesto, e `setState` em cada uma renderiza a tela toda. */
  /* `open` está na dependência, e sem ele o spy **nunca registrava**.

     Este efeito roda na montagem do componente, e a tela só existe depois do
     `if (!open) return null`. Naquele momento `contentScrollRef.current` é
     `null`, o efeito sai cedo — e como `ordemDeLeitura` não muda, ele nunca mais
     roda. O sintoma é um sumário que marca sempre a primeira categoria, e que
     não muda nem com o clique (o clique funciona porque `scrollIntoView` move o
     scroll de verdade, e o estado é setado à mão).

     Depender de `open` é o que faz o efeito rodar **depois** que a tela montou. */
  useEffect(() => {
    if (!open) return;
    const raiz = contentScrollRef.current;
    if (!raiz) return;
    let agendado = 0;
    const aoRolar = () => {
      if (agendado) return;
      agendado = window.requestAnimationFrame(() => {
        agendado = 0;
        const r = raiz.getBoundingClientRect();
        const limite = r.top + 96;
        /* No fim do documento, a última categoria **nunca** alcança o topo.

           Medido: com o scroll no máximo (5737 de 5737), o topo do bloco de
           Atalhos fica em 206 e o limite em 153 — 53px de diferença, que é o
           rodapé da página. Não é bug do spy: é que o documento não tem mais
           rolagem depois dele, então o critério "passou do limite" fica
           permanentemente falso para a última categoria.

           Duas saídas, e a escolhida é a segunda:

           - Encolher o rodapé até a última categoria alcançar o topo. Funciona, e
             faz a última seção ficar colada no fim da janela — sem folga, sem
             respiro, e a rolagem ainda "estoura" no limite.
           - **No fim do documento, marcar a última categoria.** É o que a pessoa
             está vendo: com a barra de rolagem no fim, a última categoria está na
             tela, e o sumário que discorda disso está mentindo.

           A condição é `noFimDoDocumento`, e ela vale para qualquer categoria —
           não só para a última. Um documento curto o bastante para caber inteiro
           na janela tem `scrollHeight == clientHeight`, e o mesmo critério
           acerta os dois casos. */
        const noFimDoDocumento = raiz.scrollTop + raiz.clientHeight >= raiz.scrollHeight - 4;
        let atual: SettingsTabId = ordemDeLeitura[0] ?? "general";
        if (noFimDoDocumento) {
          /* No fim, a última categoria **visível** — não a última da lista. Com
             uma busca ativa, capítulos sem acerto ficam em `display: none` e a
             última da lista pode nem estar na tela. */
          const ultima = [...ordemDeLeitura].reverse().find((tab) => {
            const bloco = raiz.querySelector<HTMLElement>(`#cat-${tab}`);
            return !!bloco && bloco.offsetParent !== null;
          });
          atual = ultima ?? atual;
        } else {
          // A **última** categoria que passou do limite. Percorrer todas as sete
          // custa sete `getBoundingClientRect` por quadro — e sem `break` não há
          // nada a raciocinar sobre ordem.
          for (const tab of ordemDeLeitura) {
            const bloco = raiz.querySelector<HTMLElement>(`#cat-${tab}`);
            if (!bloco) continue;
            /* Um capítulo **escondido** tem `top === 0`, que passa o critério
               como se estivesse no topo da tela — e como o laço guarda o último
               que passou, o sumário acabava marcando o último capítulo da lista
               sempre que a busca escondia qualquer um. Medido: buscando
               "Negrito", o breadcrumb dizia "Atalhos" com "Ferramentas" na tela.

               `offsetParent === null` é o teste de "não está no fluxo", e ele
               distingue exatamente este caso de um capítulo legitimamente no
               topo. */
            if (bloco.offsetParent === null) continue;
            if (bloco.getBoundingClientRect().top <= limite) atual = tab;
          }
        }
        setCategoriaVisivel((antes) => (antes === atual ? antes : atual));
      });
    };
    raiz.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();
    return () => {
      raiz.removeEventListener("scroll", aoRolar);
      if (agendado) window.cancelAnimationFrame(agendado);
    };
  }, [open, ordemDeLeitura]);

  const colorInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const selectedTheme = useMemo(
    () => settings.themeLibrary.find((theme) => theme.id === selectedThemeId) ?? settings.themeLibrary[0] ?? null,
    [selectedThemeId, settings.themeLibrary]
  );
  const tr = (pt: string, en: string, es: string) => {
    if (settings.language === "en-US") return en;
    if (settings.language === "es-ES") return es;
    return pt;
  };
  const tabLabels: Record<SettingsTabId, string> = {
    general: tr("Geral", "General", "General"),
    appearance: tr("Temas", "Themes", "Temas"),
    editor: tr("Editor", "Editor", "Editor"),
    toolbar: tr("Ferramentas", "Toolbar", "Barra de herramientas"),
    palette: tr("Paleta de comandos", "Command palette", "Paleta de comandos"),
    presets: tr("Publicação", "Publishing", "Publicación"),
    shortcuts: tr("Atalhos", "Shortcuts", "Atajos"),
  };
  const shortcutLabels: Record<(typeof shortcutActionIds)[number], string> = {
    "file-save": tr("Salvar", "Save", "Guardar"),
    "file-open": tr("Abrir arquivo", "Open file", "Abrir archivo"),
    "file-open-folder": tr("Abrir pasta", "Open folder", "Abrir carpeta"),
    "edit-find": tr("Buscar", "Find", "Buscar"),
    "edit-snippets": "Snippets",
    "app-command-palette": tr("Paleta de comandos", "Command palette", "Paleta de comandos"),
    "app-settings": tr("Configurações", "Settings", "Configuración"),
    "fmt-bold": tr("Negrito", "Bold", "Negrita"),
    "fmt-italic": tr("Itálico", "Italic", "Cursiva"),
    "fmt-link": tr("Link", "Link", "Enlace"),
  };
  /* `toolbarSectionLabels` saiu. Ele mapeava `files`, `system`, `editing` e
     `view`, e só `editing` sobreviveu à redução da barra — as outras três
     categorias pararam de desenhar no PR #189. O único uso que restava era o
     título do cartão "Categoria", que virou o campo "Ativar a faixa", e um mapa
     com três chaves mortas é pior que nenhum: a próxima pessoa lê e conclui que
     a barra ainda tem quatro categorias.

     Os **itens** dessas categorias (`toolbarItems.fileNew`, `sysFind`, …)
     continuam em `AppSettings` e continuam sem efeito. É dívida do #189, não
     desta leva, e não mexi aqui — mexer no tipo e nas chaves é outra história. */
  const toolbarItemLabels: Record<string, string> = {
    new: tr("Novo", "New", "Nuevo"),
    open: tr("Abrir", "Open", "Abrir"),
    openFolder: tr("Abrir pasta", "Open folder", "Abrir carpeta"),
    save: tr("Salvar", "Save", "Guardar"),
    export: tr("Exportar", "Export", "Exportar"),
    find: tr("Buscar", "Find", "Buscar"),
    snippets: "Snippets",
    theme: t["toolbar.theme"] ?? tr("Tema", "Theme", "Tema"),
    sidebar: t["view.sidebar"] ?? "Sidebar",
    editor: t["view.editor"] ?? tr("Editor", "Editor", "Editor"),
    split: t["view.split"] ?? tr("Dividido", "Split", "Dividido"),
    preview: t["view.preview"] ?? tr("Visualização", "Preview", "Vista previa"),
    zen: t["view.zen"] ?? tr("Modo zen", "Zen mode", "Modo zen"),
    settings: t.settings ?? tr("Configurações", "Settings", "Configuración"),
    formatMarkdown: t["tool.formatMarkdown"] ?? tr("Formatar Markdown", "Format Markdown", "Formatear Markdown"),
    minifyMarkdown: t["tool.minifyMarkdown"] ?? tr("Minificar Markdown", "Minify Markdown", "Minificar Markdown"),
    bold: t["tool.bold"] ?? tr("Negrito", "Bold", "Negrita"),
    italic: t["tool.italic"] ?? tr("Itálico", "Italic", "Cursiva"),
    code: t["tool.code"] ?? tr("Código", "Code", "Código"),
    link: t["tool.link"] ?? tr("Link", "Link", "Enlace"),
    image: t["tool.image"] ?? tr("Imagem", "Image", "Imagen"),
    list: t["tool.ul"] ?? tr("Lista", "List", "Lista"),
    orderedList: t["tool.ol"] ?? tr("Lista numerada", "Ordered list", "Lista numerada"),
    task: t["tool.task"] ?? tr("Tarefa", "Task", "Tarea"),
  };
  const themeColorFields = [
    {
      key: "bgHex" as const,
      label: tr("Shell", "Shell", "Shell"),
      note: tr("Plano principal da janela.", "Primary window surface.", "Plano principal de la ventana."),
    },
    {
      key: "uiHex" as const,
      label: tr("Chrome", "Chrome", "Chrome"),
      note: tr(
        "Topos, painéis e superfícies auxiliares.",
        "Top bars, panels, and secondary surfaces.",
        "Topes, paneles y superficies auxiliares."
      ),
    },
    {
      key: "uiBorderHex" as const,
      label: tr("Borda", "Border", "Borde"),
      note: tr("Separadores e contornos do shell.", "Shell dividers and outlines.", "Separadores y contornos del shell."),
    },
    {
      key: "fgHex" as const,
      label: tr("Texto do shell", "Shell text", "Texto del shell"),
      note: tr("Legibilidade dos painéis e controles.", "Panel and control legibility.", "Legibilidad de paneles y controles."),
    },
    {
      key: "editorBgHex" as const,
      label: tr("Editor", "Editor", "Editor"),
      note: tr("Fundo da área de edição.", "Editor background.", "Fondo del área de edición."),
    },
    {
      key: "editorFgHex" as const,
      label: tr("Texto do editor", "Editor text", "Texto del editor"),
      note: tr("Texto e linha ativa do editor.", "Editor text and active line.", "Texto y línea activa del editor."),
    },
    {
      key: "accentHex" as const,
      label: tr("Acento", "Accent", "Acento"),
      note: tr("Destaques, badges e focos.", "Highlights, badges, and focus points.", "Destacados, badges y puntos de foco."),
    },
  ];

  useEffect(() => {
    if (!open) return;
    setSelectedThemeId(settings.theme);
  }, [open, settings.theme]);

  /* Abrir num ponto da tela. `initialTab` deixou de escolher uma **aba**, porque
     não há mais aba: o conteúdo é um documento. Ele agora quer dizer "comece
     lendo aqui", e a rolagem só pode acontecer **depois** que o documento existe
     no DOM — por isso o `setTimeout`. */
  useEffect(() => {
    if (!open) return;
    const destino = focusTarget ?? initialTab;
    if (!destino || !(destino in tabLabels)) return;
    const timer = window.setTimeout(() => {
      rolarParaCategoria(destino as SettingsTabId, "auto");
    }, 80);
    return () => window.clearTimeout(timer);
  }, [open, focusTarget, initialTab, rolarParaCategoria]);

  /* Um capítulo que não tem nada dentro **sai da tela** enquanto a busca está ativa.

     Antes ficava o título sozinho: "Temas", "Editor", "Ferramentas" com um vão
     embaixo e nenhum campo. Uma lista de resultados que mostra um capítulo
     vazio não é uma lista de resultados — é a tela inteira com buracos, e obriga
     a pessoa a rolar para descobrir que não havia nada ali.

     É medido no DOM, e não calculado antes do desenho, por um motivo concreto: os
     capítulos ainda em JSX (`renderSectionCard`) recebem conteúdo opaco, e não há
     como perguntar "este capítulo casou?" sem desenhar. O que sobra depois do
     desenho é a única pergunta que vale para os dois lados — capítulo no esquema
     e capítulo em JSX — e é uma linha no mesmo laço.

     Sem a busca, o efeito restaura tudo: ele não esconde nada, só decide durante
     uma busca.

     **Este efeito precisa ficar acima do `if (!open) return null`.** Hook
     condicional é a forma mais direta de quebrar a tela inteira: o React conta
     os hooks a cada desenho, e um hook que só existe com a tela aberta faz a
     contagem mudar de um desenho para o outro. O sintoma é
     "Rendered more hooks than during the previous render" e a tela em branco —
     e o `tsc` passa, porque é erro de execução, não de tipo.

     E é a mesma armadilha que o efeito do scroll-spy já tropeçou, quatro linhas
     acima, e que está documentada no comentário dele: a tela só existe depois do
     `return null`. O componente já sabia; quem chegou depois não leu. */
  /* O sumário marca **quais capítulos têm acerto**, e a busca diz **quantos**.

     O plano desta fatia previa trocar o documento por uma lista de resultados com
     o caminho "Ferramentas › Conteúdo da barra › Negrito". Não é isso que a
     referência faz, e é melhor não fazer: no Windows 11 a busca **filtra a
     página** e marca na coluna quais páginas casaram. Uma lista de resultados
     tira o contexto — ela joga fora a seção que você está olhando e a posição em
     que você estava, para mostrar um texto parecido com o que já estava na tela.

     O que faltava era o **onde**: com 7 capítulos empilhados num documento só,
     "algo casou aqui em algum lugar" não ajuda ninguém. Marcando o sumário, a
     coluna vira o índice do que a busca encontrou — e ela já é o sumário do
     documento, então cumpre as duas funções com a mesma peça.

     E a contagem responde "quanto", que é a outra metade. Um contador de
     resultados é barato e é a diferença entre "a busca achou alguma coisa" e
     "a busca achou 12 coisas".

     `aria-live` no contador: quem não enxerga o número precisa ouvi-lo, senão o
     filtro some e o leitor de tela não_avisa nada. */
  useEffect(() => {
    const raiz = contentScrollRef.current;
    if (!raiz) return;
    const buscando = busca.trim().length > 0;
    const capitulosComAcerto = new Set<string>();

    for (const capitulo of raiz.querySelectorAll<HTMLElement>("[data-settings-category]")) {
      const temSecao = !!capitulo.querySelector("[data-settings-section]");
      capitulo.style.display = buscando && !temSecao ? "none" : "";
      if (temSecao) capitulosComAcerto.add(capitulo.getAttribute("data-settings-category") ?? "");
    }

    for (const item of document.querySelectorAll<HTMLElement>(".ml-settings-nav-item")) {
      const cat = item.getAttribute("data-nav-cat");
      item.classList.toggle("ml-settings-nav-item--achou", buscando && !!cat && capitulosComAcerto.has(cat));
    }
  }, [busca, open]);

  if (!open) return null;

  const panelClass = `${tConfig.ui} ${tConfig.fg}`;
  const inputClass = `ml-settings-field w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${tConfig.fg}`;
  const activeTabStyle: React.CSSProperties = {
    background: `color-mix(in srgb, ${tConfig.fgHex} 14%, transparent)`,
    borderColor: `color-mix(in srgb, ${tConfig.fgHex} 10%, transparent)`,
  };

  const syncThemeLibrary = (library: ThemeDefinition[], activeThemeId = settings.theme) => {
    const nextActiveId = library.some((theme) => theme.id === activeThemeId) ? activeThemeId : library[0]?.id ?? settings.theme;
    onSettingsChange({
      themeLibrary: library,
      theme: nextActiveId,
    });
    if (!library.some((theme) => theme.id === selectedThemeId)) {
      setSelectedThemeId(nextActiveId);
    }
  };

  const updateTheme = (themeId: string, updater: (theme: ThemeDefinition) => ThemeDefinition) => {
    syncThemeLibrary(settings.themeLibrary.map((theme) => (theme.id === themeId ? updater(theme) : theme)));
  };

  const selectTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    if (settings.theme !== themeId) {
      onSettingsChange({ theme: themeId });
    }
  };

  const createCustomTheme = () => {
    const source = selectedTheme ?? settings.themeLibrary[0] ?? getBuiltInTheme(Theme.Golden);
    if (!source) return;
    const nextTheme: ThemeDefinition = {
      ...source,
      id: `custom-${crypto.randomUUID()}`,
      name: `${getThemeName(source, t)} ${tr("personalizado", "custom", "personalizado")}`,
      builtIn: false,
      baseThemeId: (source.baseThemeId ?? source.id) as Theme,
      config: { ...source.config },
    };
    const nextLibrary = [...settings.themeLibrary, nextTheme];
    setSelectedThemeId(nextTheme.id);
    syncThemeLibrary(nextLibrary, nextTheme.id);
  };

  const duplicateTheme = (theme: ThemeDefinition) => {
    const nextTheme: ThemeDefinition = {
      ...theme,
      id: `custom-${crypto.randomUUID()}`,
      name: `${getThemeName(theme, t)} ${tr("cópia", "copy", "copia")}`,
      builtIn: false,
      baseThemeId: (theme.baseThemeId ?? theme.id) as Theme,
      config: { ...theme.config },
    };
    const nextLibrary = [...settings.themeLibrary, nextTheme];
    setSelectedThemeId(nextTheme.id);
    syncThemeLibrary(nextLibrary, nextTheme.id);
  };

  const restoreBuiltInTheme = (theme: ThemeDefinition) => {
    const builtInTheme = getBuiltInTheme(theme.id);
    if (!builtInTheme) return;
    updateTheme(theme.id, () => ({ ...builtInTheme, config: { ...builtInTheme.config } }));
  };

  const removeCustomTheme = (themeId: string) => {
    const theme = settings.themeLibrary.find((item) => item.id === themeId);
    if (!theme || theme.builtIn) return;
    const nextLibrary = settings.themeLibrary.filter((item) => item.id !== themeId);
    const fallbackThemeId =
      settings.theme === themeId ? nextLibrary[0]?.id ?? Theme.Golden : settings.theme;
    setSelectedThemeId(fallbackThemeId);
    syncThemeLibrary(nextLibrary, fallbackThemeId);
  };

  const setShortcut = (actionId: string, event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const keys: string[] = [];
    if (event.ctrlKey) keys.push("Ctrl");
    if (event.altKey) keys.push("Alt");
    if (event.shiftKey) keys.push("Shift");
    if (event.metaKey) keys.push("Meta");
    const ignored = ["Control", "Alt", "Shift", "Meta"];
    if (!ignored.includes(event.key)) {
      keys.push(event.key.length === 1 ? event.key.toUpperCase() : event.key);
    }
    if (keys.length === 0) return;
    onSettingsChange({
      customShortcuts: {
        ...(settings.customShortcuts ?? {}),
        [actionId]: keys.join("+"),
      },
    });
  };

  const updatePreset = (presetId: string, updater: (preset: PublicationPreset) => PublicationPreset) => {
    onPublicationPresetsChange((current) => current.map((preset) => (preset.id === presetId ? updater(preset) : preset)));
  };

  const renderSwitch = (checked: boolean, onChange: (next: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex h-6 w-11 items-center rounded-full border px-0.5 transition ${checked ? "justify-end" : "justify-start"} ml-settings-field`}
      aria-pressed={checked}
    >
      <span className={`h-5 w-5 rounded-full shadow-sm ${checked ? "bg-emerald-400" : "bg-[color-mix(in_srgb,var(--ml-fg,#111827)_18%,transparent)]"}`} />
    </button>
  );

/* Uma **seção**: título, descrição, e as opções sem cartão em volta.

     O cartão saiu por pedido do dono, e o motivo estava na captura: eram
     "muitas bordas sobre bordas". A tela tinha **três** níveis de contorno
     empilhados — a caixa da seção, a caixa da opção dentro dela, e a borda da
     linha de opção — e três contornos para dizer a mesma coisa: *isto é um
     grupo*. Um é suficiente.

     A seção agora é um título, com a descrição abaixo em tom mais fraco, e as
     opções soltas separadas por **espaço**. O espaço substitui a borda: a mesma
     hierarquia, sem mais uma linha para desenhar. E o nome da função ficou
     `renderSectionCard` só porque renomear as quinze chamadas não compra nada —
     o cartão que ela nomeia é justamente o que saiu.

     O alvo do clique é o cabeçalho inteiro, e não o ícone de 16px: um alvo de
     16px é um alvo pequeno, e o cabeçalho inteiro é a área que o dedo procura.

     O estado é por seção e por sessão, e não vai para o disco: fechar uma seção
     é preferência de leitura, não configuração do programa.

     `data-settings-section` é o gancho que o scroll-spy e a busca observam, e
     `scroll-mt-24` é o respiro para o cabeçalho fixo não cobrir o título. */
  /* A busca compara **sem acento e sem caixa**. Sem isso, "configuracao" não
     acha "configuração" e quem digita sem cedilha — o jeito normal, num teclado
     sem cedilha — conclui que a busca está quebrada. Custa uma linha e é a
     diferença entre a busca funcionar e não. */
  const semAcento = (v: string) =>
    v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const renderSectionCard = (title: string, description: string, contentNode: React.ReactNode) => {
    const id = `sec-${title}`;
    const buscaAtiva = busca.trim().length > 0;
    // Com busca ativa a seção **abre**: o que casou precisa estar visível.
    const fechada = !buscaAtiva && !!collapsedSections[id];
    // A seção se esconde inteira em vez de mostrar uma casca vazia. Filtrar
    // aqui, e não nos quinze pontos de chamada, é o que faz uma edição valer
    // para a tela inteira.
    if (buscaAtiva && !semAcento(`${title} ${description}`).includes(semAcento(busca.trim()))) {
      return null;
    }
    matches++;
    return (
      <section id={id} data-settings-section="true" className="scroll-mt-24 pt-9 first:pt-0">
        <button
          type="button"
          aria-expanded={!fechada}
          aria-controls={`${id}-corpo`}
          onClick={() => setCollapsedSections((atual) => ({ ...atual, [id]: !fechada }))}
          className="group flex w-full items-start gap-3 rounded-lg py-1.5 text-left hover:bg-[color-mix(in_srgb,var(--ml-fg,#111827)_5%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color-mix(in_srgb,var(--ml-accent,#60a5fa)_46%,transparent)]"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold tracking-tight">{title}</span>
            <span className="mt-1 block text-[13px] leading-snug opacity-65">{description}</span>
          </span>
          <ChevronDown
            size={16}
            aria-hidden
            className={`mt-1 shrink-0 opacity-45 transition-transform duration-150 group-hover:opacity-80 ${
              fechada ? "" : "rotate-180"
            }`}
          />
        </button>
        {!fechada && (
          <div id={`${id}-corpo`} className="pt-5">
            {contentNode}
          </div>
        )}
      </section>
    );
  };

  const renderRangeField = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    suffix: string,
    onChange: (next: number) => void
  ) => (
    <label className="ml-settings-field-block block space-y-2 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="opacity-80">{label}</span>
        <span className="rounded-full px-2 py-0.5 text-xs opacity-70">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-current"
      />
    </label>
  );

  const renderColorField = ({
    pickerId,
    label,
    note,
    value,
    onChange,
  }: {
    pickerId: string;
    label: string;
    note: string;
    value: string;
    onChange: (next: string) => void;
  }) => (
    <div className="ml-settings-color-row flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1 text-xs opacity-65">{note}</div>
      </div>
      <div className="flex min-w-0 items-center gap-2 sm:w-[210px]">
        <input
          ref={(node) => {
            colorInputRefs.current[pickerId] = node;
          }}
          type="color"
          className="hidden"
          value={normalizeHex(value, "#000000")}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          onClick={() => colorInputRefs.current[pickerId]?.click()}
          className="ml-settings-field flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border p-1"
          title={tr("Abrir seletor de cor", "Open color picker", "Abrir selector de color")}
        >
          <span className="h-full w-full rounded-lg border border-black/10" style={{ backgroundColor: value }} />
        </button>
        <input
          className={`${inputClass} min-w-0 flex-1 font-mono text-xs`}
          value={normalizeHex(value, "#000000")}
          onChange={(event) => onChange(normalizeHex(event.target.value, value))}
        />
      </div>
    </div>
  );

/* O texto que a busca compara. Inclui o rótulo do campo e a sua segunda
     linha, e é esta linha — e não o título da seção — que faz "Sidebar" e
     "tamanho" aparecerem na busca pela primeira vez. */
  const textoDoCampo = (campo: Field): string => {
    const dica = "hint" in campo ? campo.hint ?? "" : "";
    const base = campo.kind === "path" ? `${campo.label} ${campo.value}` : `${campo.label} ${dica}`;
    if (campo.kind === "select") return `${base} ${campo.options.map((o) => o.label).join(" ")}`;
    return base;
  };
  /* Uma linha, e a mesma linha para os cinco tipos.

     O que há de comum: nome à esquerda, controle à direita, e **a mesma margem
     direita para todos** — `grid-cols-[minmax(0,1fr)_auto]` resolve, porque
     `auto` encosta o controle na borda da linha seja ele um switch de 44px ou um
     select de 180px. Alinhar pela direita, e não pela esquerda, é o que faz o
     olho varrer a coluna dos controles em vez de caçar cada um.

     O `select` encolhe para 180px porque era o que faltava para a coluna existir:
     "Idioma" era um campo empilhado de largura total e "Unidades" era um pill à
     direita — dois desenhos para o mesmo controle. */
/* Toda linha tem **três** colunas: rótulo à esquerda, valor, controle.

     A coluna do valor é o que faltava, e é a diferença que a referência do
     Windows 11 deixa obvia: lá, uma linha de interruptor mostra "Desativado" ao
     lado do interruptor. Aqui o select mostra "Métrico" e o interruptor não
     mostrava nada — a mesma tela com dois jeitos de ler o mesmo fato, e quem
     lê precisa deduzir o estado da posição do botão.

     O texto não é decoração: ele também é o **alvo**. O interruptor tem 44x24,
     que é um alvo pequeno para o dedo e curto para o cursor; rótulo + valor são
     ~200px de alvo, e clicar neles liga e desliga.

     A coluna do valor tem largura fixa, para os valores alinharem entre si —
     é o que permite varrer a coluna e ler os estados de relance. */
  const renderField = (campo: Field): React.ReactNode => {
    const casou = termoBusca.length > 0 && semAcento(textoDoCampo(campo)).includes(termoBusca);
    if (casou) camposCasaram++;

    const segundaLinha = campo.kind === "path" ? campo.value : "hint" in campo ? campo.hint ?? "" : "";

    const rotulo = (
      <span className="min-w-0">
        <span className="block text-sm font-medium">{campo.label}</span>
        {segundaLinha ? <span className="mt-0.5 block truncate text-xs opacity-70">{segundaLinha}</span> : null}
      </span>
    );

    /* O valor. Para o switch é o próprio estado em palavras; para o select é
       omitido, porque o select já mostra o valor escolhido dentro dele — duas
       vezes o mesmo texto seria redundância, e a coluna vazia mantém o
       alinhamento porque o `grid` reserva o espaço. */
    const valor =
      campo.kind === "switch" ? (
        <span className="text-xs opacity-70 tabular-nums">{campo.checked ? tr("Ligado", "On", "Activado") : tr("Desligado", "Off", "Desactivado")}</span>
      ) : null;

    /* O realce marca **o campo que casou**, e não o grupo inteiro: com 65
       controles em 7 capítulos, quase nenhum está visível ao mesmo tempo, e a
       busca é o único caminho para a maioria deles. Marcar o capítulo inteiro
       seria dizer "achamos alguma coisa aqui" — marcar o campo diz o quê. */
    const linha = (conteudo: React.ReactNode, comColunaValor = false) => (
      <div
        key={campo.id}
        data-field-id={campo.id}
        className={`ml-settings-row ml-settings-field-row grid items-center gap-4 rounded-lg px-3.5 py-3 ${
          comColunaValor ? "grid-cols-[minmax(0,1fr)_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto]"
        } ${casou ? "ml-settings-field-row--hit" : ""}`}
      >
        {rotulo}
        {comColunaValor && valor}
        {conteudo}
      </div>
    );

    if (campo.kind === "custom") return <div key={campo.id}>{campo.node}</div>;

    /* O interruptor é o alvo menor, e o rótulo e o valor são o alvo grande. O
       `<label>` faz os três clicarem, e o `cursor-pointer` diz que isso é
       clicável — sem ele a linha parece texto e só o botão de 44px responde. */
    if (campo.kind === "switch") {
      return linha(
        <span className="cursor-pointer">
          {renderSwitch(campo.checked, campo.onChange)}
        </span>,
        true
      );
    }

    if (campo.kind === "select") {
      /* A largura segue o **conteúdo**, entre 180 e 300px, como na referência.
         Largura fixa obrigaria a truncar "Padrão: nome, subtítulo e palavras-
         chave" e "Profundo: inclui conteúdo de snippets…", e quem lê o valor
         truncado não sabe o que escolheu. O `auto` deixa o `<select>` nativo
         medir a opção mais longa; o piso e o teto impedem que ele fique
         minúsculo ou domine a linha. E continua sendo uma regra, não uma
         exceção por campo. */
      return linha(
        <select
          className="ml-settings-btn min-w-[180px] max-w-[300px] shrink-0 rounded px-3 py-1.5 text-xs font-medium"
          style={{ backgroundColor: tConfig.accentHex + "12", color: tConfig.accentHex, border: `1px solid ${tConfig.uiBorderHex}` }}
          value={campo.value}
          onChange={(event) => campo.onChange(event.target.value)}
        >
          {campo.options.map((opcao) => (
            <option key={opcao.value} value={opcao.value}>
              {opcao.label}
            </option>
          ))}
        </select>
      );
    }

    /* O range **não** vai para a coluna do controle. Um slider com 240px ao lado
       de um rótulo tem curso curto demais para ajuste fino, e ajuste fino é
       exatamente para que serve "Tamanho base" e "Altura de linha". Ele fica na
       largura toda da linha: rótulo e valor numa linha, cursor na de baixo.

       A coluna do valor existe para o mesmo motivo do switch — quem lê precisa
       ver o número, não adivinhar pela posição do cursor. */
    if (campo.kind === "range") {
      return (
        <div key={campo.id} data-field-id={campo.id} className={`ml-settings-row ml-settings-range rounded-lg px-3.5 py-3 ${casou ? "ml-settings-field-row--hit" : ""}`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium">{campo.label}</span>
              {segundaLinha ? <span className="mt-0.5 block truncate text-xs opacity-70">{segundaLinha}</span> : null}
            </span>
            <span className="shrink-0 text-xs opacity-80 tabular-nums">
              {campo.value}
              {campo.unit ? <span className="opacity-60">{campo.unit}</span> : null}
            </span>
          </div>
          <input
            type="range"
            className="mt-2 w-full"
            min={campo.min}
            max={campo.max}
            step={campo.step}
            value={campo.value}
            onChange={(event) => campo.onChange(Number(event.target.value))}
          />
        </div>
      );
    }

    if (campo.kind === "number") {
      return linha(
        <input
          type="number"
          className="ml-settings-field w-[110px] shrink-0 rounded border px-2 py-1.5 text-right text-xs outline-none"
          style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}
          min={campo.min}
          max={campo.max}
          step={campo.step}
          value={campo.value}
          onChange={(event) => campo.onChange(Number(event.target.value))}
        />
      );
    }

    if (campo.kind === "color") {
      return linha(
        <input
          type="color"
          className="ml-settings-field h-8 w-16 shrink-0 cursor-pointer rounded-lg border px-1 py-0.5"
          value={normalizeHex(campo.value, "#000000")}
          onChange={(event) => campo.onChange(event.target.value)}
        />
      );
    }

    /* O atalho é um campo de leitura que captura a tecla. `readOnly` impede que
       o texto digitado apareça e seja salvo como se fosse uma combinação — o que
       salvava, até o `onKeyDown` tratar cada tecla. */
    if (campo.kind === "shortcut") {
      return linha(
        <input
          readOnly
          className={`${inputClass} h-8 w-[180px] shrink-0 py-0 text-center text-xs`}
          value={campo.value}
          placeholder={campo.placeholder}
          onKeyDown={campo.onCapture}
        />
      );
    }

    /* O caminho fica na coluna da esquerda porque é o valor — e um valor longo
       espremido à direita empurraria o nome para fora. O botão é a única coisa
       que vai para a margem comum. */
    return linha(
      <button
        type="button"
        onClick={campo.onAction}
        className="ml-settings-btn shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium"
        style={{ backgroundColor: tConfig.accentHex + "20", color: tConfig.accentHex }}
      >
        {campo.action}
      </button>
    );
  };

  /* Um grupo de campos: o cabeçalho só existe se houver pares.

     `fields.length > 1` é a regra, e ela é uma linha. "Geral" tinha 4 seções
     para 10 controles, e duas delas eram **um** interruptor e **um** select
     sozinhos — um cabeçalho de seção existe para organizar mais de uma coisa, e
     a seção com um item é um cabeçalho com um item embaixo. */
  const renderFieldGroup = (grupo: FieldGroup): React.ReactNode => {
    const buscaAtiva = termoBusca.length > 0;
    const alvo = semAcento(
      `${grupo.title} ${grupo.fields.map(textoDoCampo).join(" ")}`
    ).includes(termoBusca);
    if (buscaAtiva && !alvo) return null;
    gruposCasaram++;
    const fechada = !buscaAtiva && !!collapsedGroups[grupo.id];

    return (
      /* A `key` vai na `<section>` e não no botão: `grupos.map(renderFieldGroup)`
         devolve a seção, e é a seção que é filha da lista. Sem ela o React avisa
         "unique key prop" — e o aviso apareceu só porque os grupos de campos são
         a **primeira** lista de seções que este componente monta por `map`. */
      <section key={grupo.id} id={`grp-${grupo.id}`} data-settings-section="true" className="scroll-mt-24 pt-9 first:pt-0">
        <button
          type="button"
          aria-expanded={!fechada}
          aria-controls={`grp-${grupo.id}-corpo`}
          onClick={() => setCollapsedGroups((atual) => ({ ...atual, [grupo.id]: !fechada }))}
          className="group flex w-full items-start gap-3 rounded-lg py-1.5 text-left hover:bg-[color-mix(in_srgb,var(--ml-fg,#111827)_5%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color-mix(in_srgb,var(--ml-accent,#60a5fa)_46%,transparent)]"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold tracking-tight">{grupo.title}</span>
          </span>
          {fechada ? (
            <ChevronRight size={15} className="mt-0.5 shrink-0 opacity-45" />
          ) : (
            <ChevronDown size={15} className="mt-0.5 shrink-0 opacity-45" />
          )}
        </button>
        {!fechada && (
          <div id={`grp-${grupo.id}-corpo`} className="grid gap-2 pt-1">
            {grupo.fields.map(renderField)}
          </div>
        )}
      </section>
    );
  };

  const renderTabNav = () => (
    /* A coluna virou **sumário do documento**, e não um seletor de abas.

       Três mudanças, e as três são consequência de o conteúdo ser um documento
       corrido em vez de sete abas:

       - **Clica, rola.** Não troca estado: procura o bloco da categoria e rola até
         ele. Trocar estado aqui não teria para onde ir — não há aba para trocar, e
         um clique que nada faz é pior que nenhum.
       - **O item ativo vem do scroll**, não do clique. É o que o dono pediu ("ao
         fazer o scroll o menu corresponde aonde estamos") e é o que torna a coluna
         um sumário de verdade: ela conta onde você está lendo.
       - **`aria-current="location"`**, e não `"page"`. Não há página, há a seção do
         documento que você está lendo, e o leitor de tela precisa que a linguagem
         diga a mesma coisa que a tela. */
    <nav aria-label={t["settings.title"] ?? "Preferências"} className="flex flex-col gap-0.5">
      {tabs.map((tab) => {
        const active = categoriaVisivel === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            data-nav-cat={tab.id}
            aria-current={active ? "location" : undefined}
            onClick={() => rolarParaCategoria(tab.id)}
            style={active ? activeTabStyle : undefined}
            className={`ml-settings-nav-item relative flex min-w-0 items-center gap-2.5 rounded-lg py-1.5 pl-3 pr-3 text-left text-[13px] transition ${
              active ? "font-medium" : ""
            }`}
          >
            {active && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r"
                style={{ backgroundColor: tConfig.accentHex }}
              />
            )}
            <span className={active ? "opacity-100" : "opacity-60"}>{tab.icon}</span>
            <span className="min-w-0 truncate">{tabLabels[tab.id]}</span>
          </button>
        );
      })}
    </nav>
  );

  /* Quantas seções **casaram** com a busca. Precisa existir porque as seções se
     escondem dentro de `renderSectionCard`, e o esvaziamento da tela é decidido
     depois de `content` já estar montado — não há como ler o DOM aqui, e ler o
     DOM no meio da composição de JSX seria pior.
     
     Contador e não booleano porque o `StrictMode` renderiza duas vezes: `> 0`
     continua certo depois de somar o mesmo número duas vezes. */
  let matches = 0;
  /* Contadores da fatia de campos. `camposCasaram` é o que responde "achou o
     quê?" e `gruposCasaram` é o que responde "achou onde?" — o estado vazio da
     busca precisa dos dois, e sem o segundo ele mente quando um único campo
     casou dentro de um capítulo inteiro. */
  let camposCasaram = 0;
  let gruposCasaram = 0;
  const termoBusca = semAcento(busca.trim());
  const conteudoPorCategoria: Record<string, React.ReactNode> = {};


  /* Geral no esquema de campos.

     Medido antes de mexer: `Geral` tinha **4 seções para 10 controles**, e duas
     delas eram um interruptor e um select sozinhos:

     | seção                 | controles |
     |-----------------------|-----------|
     | Shell do app          | 3         |
     | Workspace             | 1         |
     | Sistema de Medidas    | 1         |
     | Diário                | 5         |

     "Workspace" e "Sistema de Medidas" existiam para chamar atenção para um
     controle cada. Onde eles foram parar:

     - **Sidebar** entra em "Shell do app", porque a descrição daquela seção já
       dizia "estrutura geral da janela" — e a barra lateral **é** estrutura de
       janela. A seção "Workspace" existia para dizer isso com três palavras.
     - **Unidades** entra em "Shell do app" também, porque é configuração de
       região e fica ao lado de "Idioma", que é a mesma coisa.

     O resultado são **2 grupos** em vez de 4, com os mesmos 10 controles.

     O que foi **descartado** junto com os cabeçalhos:

     - "Ative ou oculte a navegação lateral do projeto." — a seção inteira
       existia para dizer isso, e o campo diz "Sidebar".
     - "Unidades usadas na interface (distância, temperatura, etc.)" — e a
       segunda linha do campo é `km, °C, kg`, que é o mesmo fato com metade do
       tamanho e sem repetir a palavra "unidades" que o campo já tem.

     E o que foi **guardado**, porque apagar a linha perderia um fato:

     - "Abas" continua com a sua: manter documentos abertos numa trilha
       previsível não está no nome do campo.
     - "Importação de mídia" continua com "Cópia segura é o padrão; mover exige
       confirmação forte" — que explica por que a escolha padrão é a primeira. */
  const gruposGeral: FieldGroup[] = [
    {
      id: "shell",
      title: tr("Shell do app", "App shell", "Shell de la app"),
      fields: [
        {
          kind: "select",
          id: "geral-idioma",
          label: tr("Idioma", "Language", "Idioma"),
          value: settings.language,
          options: languages.map((code) => ({ value: code, label: code })),
          onChange: (language) => onSettingsChange({ language: language as Language }),
        },
        {
          /* O select encolhe para 180px e a unidade sai do `<option>`: "Métrico
             (km, °C, kg)" ocupava 190px dentro do próprio menu e empurrava a
             linha. Agora ela ocupa a linha inteira, que é onde há espaço. */
          kind: "select",
          id: "geral-unidades",
          label: tr("Unidades", "Units", "Unidades"),
          hint: tr("km, °C, kg", "km, °C, kg", "km, °C, kg"),
          value: settings.measurementSystem,
          options: [
            { value: "metric", label: tr("Métrico", "Metric", "Métrico") },
            { value: "imperial", label: tr("Imperial", "Imperial", "Imperial") },
          ],
          onChange: (measurementSystem) =>
            onSettingsChange({ measurementSystem: measurementSystem as "metric" | "imperial" }),
        },
        {
          kind: "switch",
          id: "geral-abas",
          label: tr("Abas", "Tabs", "Pestañas"),
          hint: tr("Mantém documentos abertos numa trilha previsível.", "Keeps open documents in a predictable strip.", "Mantiene los documentos abiertos en una franja previsible."),
          checked: settings.tabsEnabled,
          onChange: (tabsEnabled) => onSettingsChange({ tabsEnabled }),
        },
        {
          kind: "switch",
          id: "geral-janela-unica",
          label: tr("Janela única", "Single window", "Ventana única"),
          hint: tr("Reaproveita a janela atual ao abrir arquivos.", "Reuses the current window when opening files.", "Reutiliza la ventana actual al abrir archivos."),
          checked: settings.singleInstance,
          onChange: (singleInstance) => onSettingsChange({ singleInstance }),
        },
        {
          kind: "switch",
          id: "geral-sidebar",
          label: tr("Sidebar", "Sidebar", "Barra lateral"),
          hint: tr("Mostra o sumário de arquivos do projeto.", "Shows the project's file outline.", "Muestra el esquema de archivos del proyecto."),
          checked: settings.sidebarEnabled,
          onChange: (sidebarEnabled) => onSettingsChange({ sidebarEnabled }),
        },
      ],
    },
    {
      id: "diario",
      title: tr("Diário", "Journal", "Diario"),
      fields: [
        {
          kind: "path",
          id: "geral-pasta-dados",
          label: tr("Pasta de dados", "Data folder", "Carpeta de datos"),
          value: settings.journalDataDir || tr("Nenhuma pasta definida", "No folder set", "Ninguna carpeta definida"),
          action: tr("Selecionar pasta", "Select folder", "Seleccionar carpeta"),
          onAction: async () => {
            const { openFileDialog } = await import("../../services/filesystem");
            const selected = await openFileDialog({ directory: true, multiple: false });
            const path = Array.isArray(selected) ? selected[0] : selected;
            if (path) {
              onSettingsChange({ journalDataDir: path });
              onJournalFolderSelected?.(path);
            }
          },
        },
        {
          kind: "select",
          id: "geral-importacao",
          label: tr("Importação de mídia", "Media import", "Importación de medios"),
          hint: tr("Cópia segura é o padrão; mover exige confirmação forte.", "Safe copy is the default; moving requires strong confirmation.", "La copia segura es el valor predeterminado; mover requiere confirmación fuerte."),
          value: settings.journalMedia.importMode,
          options: [
            { value: "copy", label: tr("Copiar", "Copy", "Copiar") },
            { value: "ask", label: tr("Perguntar", "Ask", "Preguntar") },
            { value: "move", label: tr("Mover com confirmação", "Move with confirmation", "Mover con confirmación") },
          ],
          onChange: (mode) =>
            onSettingsChange({ journalMedia: { ...settings.journalMedia, importMode: mode as AppSettings["journalMedia"]["importMode"] } }),
        },
        {
          kind: "switch",
          id: "geral-preservar",
          label: tr("Preservar originais", "Preserve originals", "Preservar originales"),
          hint: tr("A otimização WebP sempre mantém o arquivo original.", "WebP optimization always keeps the original file.", "La optimización WebP siempre conserva el archivo original."),
          checked: settings.journalMedia.preserveOriginals,
          onChange: (preserveOriginals) =>
            onSettingsChange({ journalMedia: { ...settings.journalMedia, preserveOriginals } }),
        },
        {
          kind: "switch",
          id: "geral-webp",
          label: tr("Otimizar para WebP", "Optimize to WebP", "Optimizar a WebP"),
          hint: tr("Desligado por padrão. Quando ligado, cria uma cópia WebP.", "Off by default. When enabled, creates a WebP copy.", "Desactivado por defecto. Cuando está activado, crea una copia WebP."),
          checked: settings.journalMedia.optimizeWebp,
          onChange: (optimizeWebp) => onSettingsChange({ journalMedia: { ...settings.journalMedia, optimizeWebp } }),
        },
        /* Os dois campos numéricos ganharam unidade, e nenhum dos dois tinha.

           "Dimensão máxima 2048" não diz 2048 do quê, e "Qualidade 0.85" não diz
           em que escala. Antes isso já era assim — não é regressão desta fatia —
           mas aqui ficou visível, porque os dois viraram linhas de 40px com o
           número sozinho e sem nenhuma palavra em volta.

           E a regra da segunda linha se confirma nos dois: apagar "px" perde um
           fato, e apagar "0,5 a 0,95" perde a escala. */
        {
          kind: "number",
          id: "geral-dimensao",
          label: tr("Dimensão máxima", "Max dimension", "Dimensión máxima"),
          hint: tr("Lado maior da imagem, em pixels", "Longest side of the image, in pixels", "Lado mayor de la imagen, en píxeles"),
          min: 512,
          max: 4096,
          step: 128,
          value: settings.journalMedia.maxDimension,
          onChange: (maxDimension) =>
            onSettingsChange({ journalMedia: { ...settings.journalMedia, maxDimension } }),
        },
        {
          kind: "number",
          id: "geral-qualidade",
          label: tr("Qualidade", "Quality", "Calidad"),
          hint: tr("De 0,5 a 0,95", "From 0.5 to 0.95", "De 0,5 a 0,95"),
          min: 0.5,
          max: 0.95,
          step: 0.01,
          value: settings.journalMedia.quality,
          onChange: (quality) =>
            onSettingsChange({ journalMedia: { ...settings.journalMedia, quality } }),
        },
      ],
    },
  ];

  conteudoPorCategoria["general"] = (
      <div className="grid gap-5">{gruposGeral.map(renderFieldGroup)}</div>
    );

  conteudoPorCategoria["appearance"] = (
      <div className="grid gap-5">
        {renderSectionCard(
          tr("Biblioteca de temas", "Theme library", "Biblioteca de temas"),
          tr(
            "Temas padrão podem ser editados e restaurados. Temas personalizados podem ser duplicados e removidos.",
            "Built-in themes can be edited and restored. Custom themes can be duplicated and removed.",
            "Los temas predeterminados pueden editarse y restaurarse. Los temas personalizados pueden duplicarse y eliminarse."
          ),
          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(420px,1.22fr)]">
            <div className="grid content-start gap-2.5 sm:grid-cols-2">
              {settings.themeLibrary.map((theme) => {
                const active = settings.theme === theme.id;
                const selected = selectedTheme?.id === theme.id;
                const summary = describeTheme(theme);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => selectTheme(theme.id)}
                    className={`ml-settings-row ml-settings-row--selectable rounded-xl p-3 text-left transition ${selected ? "ring-2 ring-current/20" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{getThemeName(theme, t)}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] opacity-65">
                          <span>{theme.builtIn ? tr("padrão", "built-in", "predeterminado") : tr("personalizado", "custom", "personalizado")}</span>
                          {active ? <span>{tr("ativo", "active", "activo")}</span> : null}
                        </div>
                      </div>
                      {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </div>
                    <div
                      className="mt-3 h-3 rounded-full border ml-theme-strip"
                      style={{
                        background: `linear-gradient(90deg, ${theme.config.bgHex}, ${theme.config.uiHex}, ${theme.config.editorBgHex}, ${theme.config.fgHex}, ${theme.config.accentHex})`,
                      }}
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] opacity-72">
                      <span>{tr("Acento", "Accent", "Acento")} {summary.accentContrast}:1</span>
                      <span>{tr("Contraste", "Contrast", "Contraste")} {summary.contrast}:1</span>
                      <span>
                        {summary.shellDelta > 0.08
                          ? tr("variação marcada", "distinct variation", "variación marcada")
                          : tr("variação suave", "soft variation", "variación suave")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedTheme ? (
              <div className="ml-settings-editor-pane rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">
                      {selectedTheme.builtIn
                        ? tr("Tema padrão", "Built-in theme", "Tema predeterminado")
                        : tr("Tema customizado", "Custom theme", "Tema personalizado")}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{getThemeName(selectedTheme, t)}</h3>
                    <p className="mt-1 text-sm opacity-70">
                      {tr(
                        "Ajuste shell, chrome, editor e destaque sem perder a opção de restaurar o original.",
                        "Adjust shell, chrome, editor, and accent colors while keeping the original available to restore.",
                        "Ajusta shell, chrome, editor y acento sin perder la opción de restaurar el original."
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="ml-settings-field rounded-lg border px-3 py-2 text-sm" onClick={createCustomTheme}>
                      {tr("Novo tema", "New theme", "Nuevo tema")}
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => duplicateTheme(selectedTheme)}
                    className="ml-settings-field inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
                  >
                    <CopyPlus className="h-4 w-4" />
                    {tr("Duplicar", "Duplicate", "Duplicar")}
                  </button>
                  {selectedTheme.builtIn ? (
                    <button
                      type="button"
                      onClick={() => restoreBuiltInTheme(selectedTheme)}
                      className="ml-settings-field inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {tr("Restaurar padrão", "Restore default", "Restaurar predeterminado")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeCustomTheme(selectedTheme.id)}
                      className="ml-settings-field inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      {tr("Remover tema", "Remove theme", "Eliminar tema")}
                    </button>
                  )}
                </div>

                {!selectedTheme.builtIn ? (
                  <label className="mt-4 block space-y-2">
                    <span className="text-sm opacity-80">{tr("Nome do tema", "Theme name", "Nombre del tema")}</span>
                    <input
                      className={inputClass}
                      value={selectedTheme.name}
                      onChange={(event) =>
                        updateTheme(selectedTheme.id, (theme) => ({ ...theme, name: event.target.value }))
                      }
                    />
                  </label>
                ) : null}

                <div className="mt-4 grid gap-2.5">
                  {themeColorFields.map((field) => (
                    <div key={String(field.key)}>
                      {renderColorField({
                        pickerId: `theme-${selectedTheme.id}-${String(field.key)}`,
                        label: field.label,
                        note: field.note,
                        value: String(selectedTheme.config[field.key]),
                        onChange: (next) =>
                          updateTheme(selectedTheme.id, (theme) => ({
                            ...theme,
                            config: {
                              ...theme.config,
                              [field.key]: normalizeHex(next, String(theme.config[field.key])),
                            },
                          })),
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );

  /* Editor no esquema. Três grupos que passam a ser heterogêneos de propósito:
     "Tipografia" é quase toda escolha de valor, "Cursor e caret" é escolha de
     valor mais duas medidas, e "Escrita" é uma lista de interruptores com um
     intervalo no fim. Antes os três eram listas de controles iguais, e o título
     não acrescentava nada ao que embaixo já dizia. */
  const gruposEditor: FieldGroup[] = [
    {
      id: "tipografia",
      title: tr("Tipografia do editor", "Editor typography", "Tipografía del editor"),
      fields: [
        {
          kind: "select",
          id: "editor-familia",
          label: tr("Família", "Family", "Familia"),
          hint: tr("A fonte do editor. A preview publicada usa a mesma.", "The editor font. The published preview uses the same one.", "La fuente del editor. La vista publicada usa la misma."),
          value: settings.fontFamily,
          options: [
            { value: "mono", label: "Mono" },
            { value: "sans", label: "Sans" },
            { value: "serif", label: "Serif" },
          ],
          onChange: (fontFamily) => onSettingsChange({ fontFamily }),
        },
        {
          kind: "range",
          id: "editor-tamanho",
          label: tr("Tamanho base", "Base size", "Tamaño base"),
          min: 12,
          max: 24,
          step: 1,
          value: settings.fontSize,
          unit: "px",
          onChange: (fontSize) => onSettingsChange({ fontSize }),
        },
        {
          kind: "range",
          id: "editor-altura-linha",
          label: tr("Altura de linha", "Line height", "Altura de línea"),
          min: 1.2,
          max: 2.1,
          step: 0.05,
          value: settings.lineHeight,
          onChange: (lineHeight) => onSettingsChange({ lineHeight }),
        },
      ],
    },
    {
      id: "caret",
      title: tr("Cursor e caret", "Pointer and caret", "Cursor y caret"),
      fields: [
        {
          kind: "select",
          id: "editor-cursor-mouse",
          label: tr("Cursor do mouse", "Mouse pointer", "Cursor del mouse"),
          value: settings.editorCursor.pointer,
          options: [
            { value: "outlined", label: tr("I-beam com contorno", "Outlined I-beam", "I-beam con contorno") },
            { value: "system", label: tr("Sistema", "System", "Sistema") },
          ],
          onChange: (pointer) =>
            onSettingsChange({
              editorCursor: { ...settings.editorCursor, pointer: pointer as AppSettings["editorCursor"]["pointer"] },
            }),
        },
        {
          kind: "range",
          id: "editor-caret-espessura",
          label: tr("Espessura da caret", "Caret width", "Grosor de caret"),
          min: 1,
          max: 6,
          step: 1,
          value: settings.editorCursor.caretWidth,
          unit: "px",
          onChange: (caretWidth) => onSettingsChange({ editorCursor: { ...settings.editorCursor, caretWidth } }),
        },
        {
          kind: "range",
          id: "editor-caret-pulso",
          label: tr("Pulso da caret", "Caret blink", "Pulso de caret"),
          hint: tr("Quanto tempo o cursor fica visível antes de piscar.", "How long the caret stays visible before blinking.", "Cuánto tiempo el cursor queda visible antes de parpadear."),
          min: 240,
          max: 1400,
          step: 40,
          value: settings.editorCursor.caretBlinkIntervalMs,
          unit: "ms",
          onChange: (caretBlinkIntervalMs) =>
            onSettingsChange({ editorCursor: { ...settings.editorCursor, caretBlinkIntervalMs } }),
        },
        {
          kind: "switch",
          id: "editor-caret-piscar",
          label: tr("Piscar caret", "Blink caret", "Parpadear caret"),
          hint: tr("Desligado, a caret fica sólida.", "Off, the caret stays solid.", "Desactivado, el cursor queda sólido."),
          checked: settings.editorCursor.caretBlink,
          onChange: (caretBlink) => onSettingsChange({ editorCursor: { ...settings.editorCursor, caretBlink } }),
        },
        {
          kind: "select",
          id: "editor-caret-cor",
          label: tr("Cor da caret", "Caret color", "Color de caret"),
          value: settings.editorCursor.caretColorMode,
          options: [
            { value: "accent", label: tr("Acento do tema", "Theme accent", "Acento del tema") },
            { value: "text", label: tr("Texto do editor", "Editor text", "Texto del editor") },
            { value: "custom", label: tr("Personalizada", "Custom", "Personalizada") },
          ],
          onChange: (caretColorMode) =>
            onSettingsChange({
              editorCursor: { ...settings.editorCursor, caretColorMode: caretColorMode as AppSettings["editorCursor"]["caretColorMode"] },
            }),
        },
        {
          kind: "color",
          id: "editor-caret-cor-custom",
          label: tr("Cor personalizada", "Custom color", "Color personalizada"),
          value: settings.editorCursor.caretCustomColor,
          onChange: (caretCustomColor) =>
            onSettingsChange({ editorCursor: { ...settings.editorCursor, caretCustomColor } }),
        },
      ],
    },
    {
      id: "escrita",
      title: tr("Escrita e persistência", "Writing and persistence", "Escritura y persistencia"),
      fields: [
        { kind: "switch", id: "editor-quebra", label: tr("Quebra de linha", "Word wrap", "Ajuste de línea"), checked: settings.wordWrap, onChange: (wordWrap) => onSettingsChange({ wordWrap }) },
        { kind: "switch", id: "editor-maquina", label: tr("Modo máquina de escrever", "Typewriter mode", "Modo máquina de escribir"), checked: settings.typewriterMode, onChange: (typewriterMode) => onSettingsChange({ typewriterMode }) },
        { kind: "switch", id: "editor-foco", label: tr("Modo foco", "Focus mode", "Modo foco"), checked: settings.focusMode, onChange: (focusMode) => onSettingsChange({ focusMode }) },
        { kind: "switch", id: "editor-ortografia", label: tr("Corretor ortográfico", "Spell check", "Corrector ortográfico"), checked: settings.spellCheck, onChange: (spellCheck) => onSettingsChange({ spellCheck }) },
        {
          kind: "switch",
          id: "editor-autosave",
          label: tr("Salvamento automático", "Auto save", "Guardado automático"),
          hint: tr("Grava sozinho depois de um tempo parado.", "Writes on its own after a pause.", "Guarda solo tras una pausa."),
          checked: settings.autoSave,
          onChange: (autoSave) => onSettingsChange({ autoSave }),
        },
        {
          kind: "range",
          id: "editor-autosave-intervalo",
          label: tr("Intervalo do auto save", "Auto-save interval", "Intervalo del guardado automático"),
          min: 15,
          max: 300,
          step: 15,
          value: settings.autoSaveInterval,
          unit: "s",
          onChange: (autoSaveInterval) => onSettingsChange({ autoSaveInterval }),
        },
        { kind: "switch", id: "editor-barra-selecao", label: tr("Toolbar de seleção", "Selection toolbar", "Barra de selección"), checked: settings.selectionToolbarEnabled, onChange: (selectionToolbarEnabled) => onSettingsChange({ selectionToolbarEnabled }) },
      ],
    },
  ];

  conteudoPorCategoria["editor"] = (
      <div className="grid gap-5">{gruposEditor.map(renderFieldGroup)}</div>
    );
  /* Ferramentas no esquema.

     Três grupos viram **dois**. "Leitura da barra" tinha um interruptor só
     (que já tinha sobrevivido a leva anterior), e ele entra em "Posição e
     densidade": é o mesmo assunto — como a barra se apresenta.

     "Conteúdo da barra" era dois cartões aninhados, cada um com um título e uma
     lista de interruptores dentro. Achatar isso é o que torna as oito ações de
     formatação alcançáveis pela busca: estavam dentro de um cartão, dentro de
     uma seção, dentro de uma coluna de JSX — e a busca não percorria nenhuma
     dessas camadas. */
  const acoesEdicao = toolbarItemsBySection.filter((grupo) => grupo.titleKey === "editing");

  const gruposToolbar: FieldGroup[] = [
    {
      id: "posicao",
      title: tr("Posição e densidade", "Position and density", "Posición y densidad"),
      fields: [
        {
          kind: "select",
          id: "barra-posicao",
          label: tr("Posição da barra", "Toolbar anchor", "Ancla de la barra"),
          hint: tr("Onde a faixa vive na janela.", "Where the strip lives in the window.", "Dónde vive la franja en la ventana."),
          value: settings.floatingToolbarAnchor,
          options: [
            { value: "integrated", label: tr("Integrada ao topo", "Integrated", "Integrada") },
            { value: "bottom", label: tr("Base", "Bottom", "Inferior") },
            { value: "left", label: tr("Esquerda", "Left", "Izquierda") },
            { value: "right", label: tr("Direita", "Right", "Derecha") },
          ],
          /* Só `floatingToolbarAnchor`: o seletor gravava os dois campos com o
             mesmo valor, e o segundo nunca foi lido. */
          onChange: (floatingToolbarAnchor) => onSettingsChange({ floatingToolbarAnchor: floatingToolbarAnchor as AppSettings["floatingToolbarAnchor"] }),
        },
        {
          kind: "select",
          id: "barra-exibicao",
          label: t["settings.toolbar.display"] ?? tr("Exibição dos botões", "Button display", "Botones"),
          value: settings.toolbarDisplayMode,
          options: [
            { value: "icon_only", label: t["settings.toolbar.display.iconOnly"] ?? tr("Apenas ícone", "Icon only", "Solo icono") },
            { value: "stacked", label: t["settings.toolbar.display.stacked"] ?? tr("Ícone com rótulo abaixo", "Icon with label below", "Icono con etiqueta debajo") },
          ],
          onChange: (toolbarDisplayMode) => onSettingsChange({ toolbarDisplayMode: toolbarDisplayMode as AppSettings["toolbarDisplayMode"] }),
        },
        {
          kind: "select",
          id: "barra-comportamento",
          label: tr("Comportamento das categorias", "Category behavior", "Comportamiento de las categorías"),
          value: settings.toolbarSectionBehavior,
          options: [
            { value: "default", label: tr("Padrão", "Default", "Predeterminado") },
            { value: "repulsion", label: tr("Repulsão inteligente", "Smart repulsion", "Repulsión inteligente") },
          ],
          onChange: (toolbarSectionBehavior) => onSettingsChange({ toolbarSectionBehavior: toolbarSectionBehavior as AppSettings["toolbarSectionBehavior"] }),
        },
        {
          kind: "range",
          id: "barra-breakpoint",
          label: tr("Breakpoint compacto", "Compact breakpoint", "Breakpoint compacto"),
          hint: tr("Abaixo desta largura a barra encolhe para ícones.", "Below this width the bar shrinks to icons.", "Por debajo de este ancho la franja se reduce a iconos."),
          min: 320,
          max: 1100,
          step: 20,
          value: settings.toolbarCompactBreakpoint,
          unit: "px",
          onChange: (toolbarCompactBreakpoint) => onSettingsChange({ toolbarCompactBreakpoint }),
        },
        {
          kind: "switch",
          id: "barra-icones-texto",
          label: tr("Ícones junto do texto", "Icons alongside text", "Iconos junto al texto"),
          hint: tr("Com os ícones, a barra se lê sem esforço.", "With the icons, the bar reads without effort.", "Con los iconos, la franja se lee sin esfuerzo."),
          checked: settings.toolbarAlwaysShowIcons,
          onChange: (toolbarAlwaysShowIcons) => onSettingsChange({ toolbarAlwaysShowIcons }),
        },
      ],
    },
    {
      id: "conteudo",
      title: tr("Conteúdo da barra", "Toolbar content", "Contenido de la barra"),
      fields: [
        {
          /* Só `editing`. As outras três categorias saíram da barra com o
             desenho novo do topo, e um interruptor que liga uma seção que não
             desenha é um interruptor que promete e não cumpre. */
          kind: "switch",
          id: "barra-categoria",
          label: tr("Ativar a faixa", "Enable the strip", "Activar la franja"),
          hint: tr("A única categoria que a barra tem.", "The only category the bar has.", "La única categoría que tiene la franja."),
          checked: settings.toolbarSections.editing,
          onChange: (enabled) => onSettingsChange({ toolbarSections: { ...settings.toolbarSections, editing: enabled } }),
        },
        ...acoesEdicao.flatMap((grupo) =>
          grupo.items.map((item) => ({
            kind: "switch" as const,
            id: `barra-item-${item.key}`,
            label: toolbarItemLabels[item.labelKey] ?? item.labelKey,
            checked: settings.toolbarItems[item.key],
            onChange: (enabled: boolean) => onSettingsChange({ toolbarItems: { ...settings.toolbarItems, [item.key]: enabled } }),
          }))
        ),
      ],
    },
  ];

  conteudoPorCategoria["toolbar"] = (
      <div className="grid gap-5">{gruposToolbar.map(renderFieldGroup)}</div>
    );
  /* Paleta no esquema. Os dois grupos já tinham mais de um item, então
     nenhum título sai — o que muda é que os quatro interruptores de "Fontes de
     busca" e as duas escolhas de "Busca e execução" passam a ter coluna de
     valor e a ser encontráveis pelo nome. */
  const gruposPaleta: FieldGroup[] = [
    {
      id: "fontes",
      title: tr("Fontes de busca", "Search sources", "Fuentes de búsqueda"),
      fields: [
        { kind: "switch", id: "paleta-acoes", label: tr("Ações do app", "App actions", "Acciones de la app"), checked: settings.commandPalette.includeActions, onChange: (includeActions) => onSettingsChange({ commandPalette: { ...settings.commandPalette, includeActions } }) },
        { kind: "switch", id: "paleta-abas", label: tr("Abas abertas", "Open tabs", "Pestañas abiertas"), checked: settings.commandPalette.includeOpenTabs, onChange: (includeOpenTabs) => onSettingsChange({ commandPalette: { ...settings.commandPalette, includeOpenTabs } }) },
        { kind: "switch", id: "paleta-recentes", label: tr("Arquivos recentes", "Recent files", "Archivos recientes"), checked: settings.commandPalette.includeRecentFiles, onChange: (includeRecentFiles) => onSettingsChange({ commandPalette: { ...settings.commandPalette, includeRecentFiles } }) },
        { kind: "switch", id: "paleta-snippets", label: "Snippets", checked: settings.commandPalette.includeSnippets, onChange: (includeSnippets) => onSettingsChange({ commandPalette: { ...settings.commandPalette, includeSnippets } }) },
        {
          kind: "range",
          id: "paleta-limite",
          label: tr("Limite de resultados", "Result limit", "Límite de resultados"),
          min: 6,
          max: 40,
          step: 1,
          value: settings.commandPalette.maxResults,
          onChange: (maxResults) => onSettingsChange({ commandPalette: { ...settings.commandPalette, maxResults } }),
        },
      ],
    },
    {
      id: "execucao",
      title: tr("Busca e execução", "Search and execution", "Búsqueda y ejecución"),
      fields: [
        {
          kind: "select",
          id: "paleta-modo",
          label: tr("Modo de busca", "Search mode", "Modo de búsqueda"),
          hint: tr("Padrão casa nome, subtítulo e palavras-chave. Profundo inclui o conteúdo dos snippets e o caminho completo.", "Standard matches title, subtitle and keywords. Deep includes snippet content and the full path.", "Estándar busca nombre, subtítulo y palabras clave. Profundo incluye el contenido y la ruta completa."),
          value: settings.commandPalette.searchMode,
          options: [
            { value: "standard", label: tr("Padrão", "Standard", "Estándar") },
            { value: "deep", label: tr("Profundo", "Deep", "Profundo") },
          ],
          onChange: (searchMode) =>
            onSettingsChange({ commandPalette: { ...settings.commandPalette, searchMode: searchMode as AppSettings["commandPalette"]["searchMode"] } }),
        },
        {
          kind: "select",
          id: "paleta-execucao",
          label: tr("Execução de snippets", "Snippet execution", "Ejecución de snippets"),
          value: settings.commandPalette.snippetBehavior,
          options: [
            { value: "insert", label: tr("Inserir no editor", "Insert in the editor", "Insertar en el editor") },
            { value: "manage", label: tr("Abrir o gerenciador", "Open the manager", "Abrir el gestor") },
          ],
          onChange: (snippetBehavior) =>
            onSettingsChange({ commandPalette: { ...settings.commandPalette, snippetBehavior: snippetBehavior as AppSettings["commandPalette"]["snippetBehavior"] } }),
        },
        {
          kind: "switch",
          id: "paleta-fechar",
          label: tr("Fechar após executar", "Close after running", "Cerrar después de ejecutar"),
          hint: tr("Útil para comandos únicos. Desative para executar em sequência.", "Useful for one-off commands. Disable it for chained actions.", "Útil para comandos únicos. Desactívalo para ejecutar varios seguidos."),
          checked: settings.commandPalette.closeAfterSelect,
          onChange: (closeAfterSelect) => onSettingsChange({ commandPalette: { ...settings.commandPalette, closeAfterSelect } }),
        },
        {
          kind: "switch",
          id: "paleta-atalhos",
          label: tr("Mostrar atalhos", "Show shortcuts", "Mostrar atajos"),
          hint: tr("Exibe o hint de atalho ao lado das ações compatíveis.", "Shows shortcut hints next to compatible actions.", "Muestra el atajo al lado de las acciones compatibles."),
          checked: settings.commandPalette.showHints,
          onChange: (showHints) => onSettingsChange({ commandPalette: { ...settings.commandPalette, showHints } }),
        },
      ],
    },
  ];

  conteudoPorCategoria["palette"] = (
      <div className="grid gap-5">{gruposPaleta.map(renderFieldGroup)}</div>
    );

  const duplicatePreset = (preset: PublicationPreset) => {
    const nextPreset: PublicationPreset = {
      ...preset,
      id: `custom-${crypto.randomUUID()}`,
      name: `${preset.name} ${tr("cópia", "copy", "copia")}`,
      builtIn: false,
    };
    onPublicationPresetsChange((current) => [...current, nextPreset]);
    onSettingsChange({ publicationPresetId: nextPreset.id });
    setExpandedPresetIds([nextPreset.id]);
  };
  conteudoPorCategoria["presets"] = (
      <div className="grid gap-5">
        {renderSectionCard(
          tr("Presets de publicação", "Publishing presets", "Presets de publicación"),
          tr(
            "Preview e export HTML compartilham os mesmos tokens estruturados.",
            "Preview and HTML export share the same structural tokens.",
            "La vista previa y la exportación HTML comparten los mismos tokens estructurales."
          ),
          <div className="grid gap-4">
            {publicationPresets.map((preset) => {
              const expanded = expandedPresetIds.includes(preset.id);
              const active = settings.publicationPresetId === preset.id;
              const contrast = contrastRatio(preset.surface.text, preset.surface.bg).toFixed(1);
              return (
                <article
                  key={preset.id}
                  className={`ml-settings-row relative rounded-xl border p-4 transition-all duration-200 group ${active ? "ring-2 ring-current/10" : ""}`}
                >
                  <div className="flex w-full items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPresetIds((current) =>
                          current.includes(preset.id) ? current.filter((id) => id !== preset.id) : [...current, preset.id]
                        )
                      }
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold">{preset.name}</h3>
                        {active ? (
                          <span className="ml-settings-field flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]">
                            <Check className="h-2.5 w-2.5" />
                            {tr("ativo", "active", "activo")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm opacity-70">{preset.description}</p>
                    </button>

                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => duplicatePreset(preset)}
                          className="ml-settings-field flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          title={tr("Duplicar", "Duplicate", "Duplicar")}
                        >
                          <CopyPlus className="h-4 w-4" />
                        </button>
                        {!preset.builtIn && (
                          <button
                            type="button"
                            onClick={() =>
                              onPublicationPresetsChange((current) => current.filter((item) => item.id !== preset.id))
                            }
                            className="ml-settings-field flex h-8 w-8 items-center justify-center rounded-lg border text-rose-300 transition-colors hover:bg-rose-500/10"
                            title={tr("Remover", "Remove", "Eliminar")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {!active && (
                          <button
                            type="button"
                            onClick={() => onSettingsChange({ publicationPresetId: preset.id })}
                            className="ml-settings-field flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-emerald-500/10"
                            title={tr("Ativar", "Activate", "Activar")}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="ml-theme-strip h-4 w-24 rounded-full border sm:w-32"
                          style={{
                            background: `linear-gradient(90deg, ${preset.surface.bg}, ${preset.surface.text}, ${preset.surface.accent}, ${preset.surface.muted}, ${preset.surface.border})`,
                          }}
                        />
                        <ChevronDown className={`h-4 w-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs opacity-70">
                    <span className="ml-settings-field rounded-full border px-2 py-1">contraste {contrast}:1</span>
                    <span className="ml-settings-field rounded-full border px-2 py-1">
                      {preset.spacing.columnWidth}px coluna
                    </span>
                    <span className="ml-settings-field rounded-full border px-2 py-1">
                      {preset.typography.fontFamily.split(",")[0].replace(/'/g, "")}
                    </span>
                  </div>

                  {expanded && (
                    <div className="mt-4 grid gap-4 2xl:grid-cols-2">
                      <div className="ml-settings-group rounded-lg p-3.5">
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] opacity-70">Metadados</h4>
                        <div className="grid gap-4">
                          <label className="space-y-2">
                            <span className="text-sm opacity-80">Nome</span>
                            <input
                              className={inputClass}
                              value={preset.name}
                              onChange={(event) =>
                                updatePreset(preset.id, (current) => ({ ...current, name: event.target.value }))
                              }
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm opacity-80">Descrição</span>
                            <input
                              className={inputClass}
                              value={preset.description}
                              onChange={(event) =>
                                updatePreset(preset.id, (current) => ({ ...current, description: event.target.value }))
                              }
                            />
                          </label>
                        </div>
                      </div>
                      <div className="ml-settings-group rounded-lg p-3.5">
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
                          {tr("Superfície", "Surface", "Superficie")}
                        </h4>
                        <div className="grid gap-3">
                          {([
                            ["bg", "Fundo", "Base visual da página"],
                            ["text", "Texto", "Leitura principal"],
                            ["accent", "Acento", "Links e destaques"],
                            ["muted", "Tom secundário", "Metadados e elementos de apoio"],
                            ["border", "Borda", "Contornos de superfícies"],
                          ] as const).map(([key, label, note]) => (
                            <div key={key}>
                              {renderColorField({
                                pickerId: `preset-${preset.id}-${key}`,
                                label,
                                note,
                                value: preset.surface[key],
                                onChange: (next) =>
                                  updatePreset(preset.id, (current) => ({
                                    ...current,
                                    surface: { ...current.surface, [key]: normalizeHex(next, current.surface[key]) },
                                  })),
                              })}
                            </div>
                          ))}
                          <div className="sm:col-span-2">
                            {renderRangeField("Raio da superfície", preset.surface.radius, 0, 32, 1, "px", (radius) =>
                              updatePreset(preset.id, (current) => ({
                                ...current,
                                surface: { ...current.surface, radius },
                              }))
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-settings-group rounded-lg p-3.5">
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] opacity-70">Tipografia</h4>
                        <div className="grid gap-4">
                          {renderRangeField("Corpo", preset.typography.bodySize, 14, 24, 1, "px", (bodySize) =>
                            updatePreset(preset.id, (current) => ({
                              ...current,
                              typography: { ...current.typography, bodySize },
                            }))
                          )}
                          {renderRangeField(
                            tr("Altura de linha", "Line height", "Altura de línea"),
                            preset.typography.lineHeight,
                            1.2,
                            2.1,
                            0.05,
                            "",
                            (lineHeight) =>
                              updatePreset(preset.id, (current) => ({
                                ...current,
                                typography: { ...current.typography, lineHeight },
                              }))
                          )}
                          {renderRangeField("H1", preset.elements.h1.size, 26, 62, 1, "px", (size) =>
                            updatePreset(preset.id, (current) => ({
                              ...current,
                              elements: { ...current.elements, h1: { ...current.elements.h1, size } },
                            }))
                          )}
                          {renderRangeField("H2", preset.elements.h2.size, 22, 48, 1, "px", (size) =>
                            updatePreset(preset.id, (current) => ({
                              ...current,
                              elements: { ...current.elements, h2: { ...current.elements.h2, size } },
                            }))
                          )}
                          {renderRangeField("Parágrafo", preset.elements.p.size, 14, 24, 1, "px", (size) =>
                            updatePreset(preset.id, (current) => ({
                              ...current,
                              elements: { ...current.elements, p: { ...current.elements.p, size } },
                            }))
                          )}
                        </div>
                      </div>
                      <div className="ml-settings-group rounded-lg p-3.5">
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
                          Layout e ações
                        </h4>
                        <div className="grid gap-4">
                          {renderRangeField("Padding da página", preset.spacing.pagePadding, 12, 72, 2, "px", (pagePadding) =>
                            updatePreset(preset.id, (current) => ({ ...current, spacing: { ...current.spacing, pagePadding } }))
                          )}
                          {renderRangeField("Largura de coluna", preset.spacing.columnWidth, 520, 1080, 10, "px", (columnWidth) =>
                            updatePreset(preset.id, (current) => ({
                              ...current,
                              spacing: { ...current.spacing, columnWidth },
                            }))
                          )}
                          <div className="flex flex-wrap gap-3">
                            {!active && (
                              <button
                                type="button"
                                onClick={() => onSettingsChange({ publicationPresetId: preset.id })}
                                className="ml-settings-field rounded-lg border px-3 py-2 text-sm font-medium"
                              >
                                Usar preset
                              </button>
                            )}
                            {publicationPresets.length > 1 && !preset.builtIn && (
                              <button
                                type="button"
                                onClick={() =>
                                  onPublicationPresetsChange((current) => current.filter((item) => item.id !== preset.id))
                                }
                                className="ml-settings-field rounded-lg border px-3 py-2 text-sm font-medium text-rose-300"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
            <button
              type="button"
              onClick={() =>
                onPublicationPresetsChange((current) => [
                  ...current,
                  createPublicationPreset(
                    crypto.randomUUID(),
                    `Preset ${current.length + 1}`,
                    tr("Novo preset customizável", "New customizable preset", "Nuevo preset personalizable"),
                    { bg: "#f8fafc", text: "#111827", accent: "#1d4ed8", muted: "#475569" }
                  ),
                ])
              }
              className="ml-settings-field flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-6 text-sm font-medium opacity-60 transition-opacity hover:opacity-100"
            >
              <CopyPlus className="h-5 w-5" />
              {t["settings.presets.add"] ?? tr("Adicionar preset", "Add preset", "Agregar preset")}
            </button>
          </div>
        )}
      </div>
    );

    /* Atalhos migra para o esquema, e com ele a busca passa a alcançar os dez.

     Eram dez campos de leitura numa grade de duas colunas dentro de uma seção em
     JSX — e "Salvar", "Abrir arquivo", "Paleta de comandos" são justamente os
     nomes que alguém digita para reconfigurar uma tecla. Eles eram os dez campos
     mais procuráveis da tela inteira, e eram os dez que a busca não via.

     A grade de duas colunas sai. Com a coluna comum, dez linhas de um campo só
     leem melhor em coluna, e é o que o resto da tela faz. */
  const gruposAtalhos: FieldGroup[] = [
    {
      id: "personalizados",
      title: tr("Atalhos personalizados", "Custom shortcuts", "Atajos personalizados"),
      fields: shortcutActionIds.map((actionId) => ({
        kind: "shortcut" as const,
        id: `atalho-${actionId}`,
        label: shortcutLabels[actionId] ?? actionId,
        value: settings.customShortcuts?.[actionId] ?? "",
        placeholder: tr("Pressione um atalho", "Press a shortcut", "Presiona un atajo"),
        onCapture: (event: React.KeyboardEvent<HTMLInputElement>) => setShortcut(actionId, event),
      })),
    },
  ];

  conteudoPorCategoria["shortcuts"] = (
      <div className="grid gap-5">{gruposAtalhos.map(renderFieldGroup)}</div>
    );

  /* Página inteira, e não mais um diálogo sobre a aplicação.

   O que saiu, e por quê:
   - o **backdrop** `bg-black/40 backdrop-blur-[2px]`: escurecer o editor para
    ATRÁS de uma tela que ocupa tudo não escurece nada — só Mama o resto do app
     com um véu que não tem sobre o que ser.
   - o **`inset: --ml-settings-viewport-gap`**: a moldura que deixava a tela do
     editor aparecendo em volta. O dono chamou de "desperdiçar espaço"; a conta é
     `clamp(16px, 4vmin, 56px)` de cada lado.
   - o **`rounded-2xl`** e a borda: cantos arredondados são linguagem de cartão
     flutuante. Em página inteira eles só denunciam que a casca nasceu num modal.

   O que fica: a **coluna de navegação à esquerda** e o conteúdo rolável à
   direita, que é o padrão do Windows 11 que o dono mandou de referência.

   **Deixa de ser `dialog` de propósito.** `role="dialog"` + `aria-modal`
   prometem que nada fora está disponível ao teclado e ao leitor de tela — e num
   diálogo sobre outra tela isso é verdade. Numa página inteira é mentira, e o
   `Escape` que fecha tudo continua sendo do handler global em `App.tsx`, que já
   existia antes desta tela e não mudou. */

  // `content` já foi montado acima, e cada `renderSectionCard` que casou com a
  // busca contou. É aqui que a resposta fica disponível — antes do `return`, e
  // não antes de `content`, porque `content` é justamente o que conta.
  /* `matches` conta só as seções antigas, e `gruposCasaram` os grupos novos.
     Somar os dois não é redundância: sem isso, um termo que casasse apenas em
     "Geral" — que já migrou para o esquema — deixaria `matches` em zero e a tela
     mostraria "nada encontrado" **com o resultado na tela**. Um contador que
     esquece uma das duas metades da lista mente de um jeito que só se vê
     digitando. */
  const temResultado = busca.trim().length === 0 || matches > 0 || gruposCasaram > 0;

  /* Quantos **grupos/seções** casaram. É o que o contador honestamente sabe
     contar: os capítulos no esquema contam grupo a grupo, e os que ainda são
     JSX contam seção a seção — e dentro de uma seção antiga não há contagem de
     campo, porque o filtro antigo era pelo título da seção e não conhecia cada rótulo. Por
     isso o contador diz "resultados" e não "campos": dizer "campos" seria
     prometer uma granularidade que os capítulos em JSX ainda não têm. */
  const totalResultados = gruposCasaram + matches;

  return (
    <div className="fixed inset-0 z-[320] flex min-h-0 w-full">
      <div className={`ml-settings-page flex min-h-0 w-full ${panelClass}`}>
        <aside className="ml-settings-sidebar flex min-h-0 shrink-0 flex-col overflow-y-auto border-r px-3 py-5">
          <div className="mb-4 px-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-50">
              Mark-Lee v{__APP_VERSION__}
            </p>
            <h1 className="mt-1 text-base font-semibold">{t["settings.title"] ?? "Preferências"}</h1>
          </div>
          {renderTabNav()}
        </aside>
        <section className={`ml-settings-canvas flex min-h-0 min-w-0 flex-1 flex-col ${panelClass}`}>
          {/* Breadcrumb. `Início` é a única peça que não é navegação de verdade
              ainda: não há página inicial de configurações. Ela está aqui porque
              é o que dá ao usuário a noção de *onde* ele está dentro de uma tela
              que não tem título de categoria no topo — e o título da categoria
              entra como cabeçalho do conteúdo, uma linha abaixo. */}
          {/* O `flex-1` na coluna do meio e o `min-w-0` no input: sem o `min-w-0`
              o campo declara uma largura intrínseca e a breadcrumb é espremida em
              vez do campo ceder. É o mesmo motivo do `min-w-0` nos outros dois
              lugares do componente.

              Este precisa ser um comentario **de JSX** (chaves em volta) e não um
              de bloco solto: dentro do JSX, um comentario de bloco vira **texto
              renderizado**, e ele apareceu na tela. O compilador aceita — `tsc` e
              `build` passam verdes — porque texto é um nó válido, então só a
              captura pega. E o texto não pode citar a forma do próprio
              comentário, porque isso o fecha mais cedo. */}
          {/* O `pr-16` não é decoração: o botão de fechar é `absolute` no canto da
              página, e sem esta reserva a busca passa **por baixo** dele. Duas
              camadas posicionadas não conversam — uma delas tem de ceder, e a
              que está no fluxo é a que cede. */}
          <header className="ml-settings-subheader flex shrink-0 items-center gap-4 py-3 pl-6 pr-16 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span className="opacity-55">{t["settings"] ?? "Configurações"}</span>
        <ChevronRight size={13} className="shrink-0 opacity-40" />
        {/* `aria-current="location"`, e não "page": o que muda com o scroll é
            *onde* se está lendo no documento, e não uma página. */}
        <span className="truncate font-medium" aria-current="location">
          {tabLabels[categoriaVisivel]}
        </span>
      </span>
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3">
        <label className="ml-settings-search relative flex min-w-0 max-w-[320px] flex-1 items-center">
          <Search size={14} aria-hidden className="pointer-events-none absolute left-2.5 opacity-45" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t["settings.search"] ?? "Localizar uma configuração"}
            aria-label={t["settings.search"] ?? "Localizar uma configuração"}
            className={`${inputClass} h-8 py-0 pl-8 text-sm`}
          />
        </label>
        {/* A contagem fica **fora** do campo, e não dentro dele: dentro, ela
            empurra o texto para a direita conforme o número cresce, e o cursor
            anda junto. Fora, o campo não se mexe. */}
        {termoBusca.length > 0 && (
          <span
            aria-live="polite"
            className="shrink-0 whitespace-nowrap text-xs opacity-60 tabular-nums"
          >
            {totalResultados === 1
              ? tr("1 resultado", "1 result", "1 resultado")
              : tr(`${totalResultados} resultados`, `${totalResultados} results`, `${totalResultados} resultados`)}
          </span>
        )}
      </div>
    </header>
          <div ref={contentScrollRef} data-settings-scroll="true" className="min-h-0 flex-1 overflow-y-auto py-3">
            {/* O `mx-auto` centraliza e o `max-w-[860px]` segura a linha de leitura.

                O `max-w` não é vaidade: sem ele, numa janela de 1400px o rótulo de
                um switch e o próprio switch ficariam a 1300px de distância um do
                outro, e o olho perderia a linha entre o que se lê e o que se
                controla. Centralizar é também o que a referência do dono mostra. */}
            <div
              className={`mx-auto min-h-full w-full max-w-[860px] px-6 outline-none ${tConfig.fg}`}
              data-settings-tab-root="true"
              tabIndex={-1}
            >
              {/* O documento: as sete categorias, uma abaixo da outra.

                  A ordem vem de `ordemDeLeitura`, que e derivada de `tabs` — a
                  mesma lista que o menu da esquerda percorre. Documento e menu nao
                  podem divergir, e ser a mesma lista e o que garante isso. */}
{ordemDeLeitura.map((tab) => (
                /* Cada categoria é um capítulo do documento, e precisa do
                   **título do capítulo**.

                   Sem ele, quem rola vê "Snippets", "Limite de resultados",
                   "Presets de publicação" aparecendo sem saber onde começou
                   "Paleta de comandos" e onde termina "Temas". O sumário da
                   esquerda ajuda, mas ele é fino e some do campo de visão numa
                   rolagem longa — e o título é o que dá a noção de *onde* se está
                   lendo. Medido na captura: as opções apareciam sem nenhum
                   cabeçalho acima delas.

                   O `sticky` não é enfeite: o título acompanha a rolagem dentro da
                   categoria, que é o que a referência do Windows 11 faz com o
                   cabeçalho de cada página.

                   E o título **não** repete o que o sumário já diz: ele é a única
                   ocorrência do nome da categoria no documento, e por isso é
                   também o alvo da busca por nome. */
                <section
                  key={tab}
                  id={`cat-${tab}`}
                  data-settings-category={tab}
                  aria-labelledby={`cat-${tab}-titulo`}
                  className="scroll-mt-24 pb-4 pt-14 first:pt-2"
                >
                  <h2
                    id={`cat-${tab}-titulo`}
                    className="ml-settings-cat-title sticky top-0 z-10 -mx-1 mb-1 flex items-center gap-2.5 bg-[var(--ml-bg)] px-1 py-3 text-[19px] font-semibold tracking-tight"
                  >
                    <span className="opacity-45">{tabs.find((x) => x.id === tab)?.icon}</span>
                    <span className="truncate">{tabLabels[tab]}</span>
                  </h2>
                  {conteudoPorCategoria[tab]}
                </section>
              ))}
              {/* Estado vazio da busca. Sem ele, uma busca que não acha nada e uma
                  busca que ainda não carregou são **a mesma tela**: um retângulo
                  vazio. E o pior: o usuário não sabe se digitou errado, se a
                  configuração não existe, ou se a tela quebrou. Duas linhas
                  dizendo o que houve resolvem as três leituras. */}
              {busca.trim().length > 0 && !temResultado && (
                <div className="flex flex-col items-start gap-1 py-10 text-sm">
                  <p className="font-medium opacity-80">
                    {tr(
                      `Nada encontrado para “${busca.trim()}”`,
                      `Nothing found for “${busca.trim()}”`,
                      `No se encontró nada para “${busca.trim()}”`
                    )}
                  </p>
                  <p className="opacity-65">
                    {tr(
                      `A busca cobre o nome de cada configuração, de cada categoria e de cada capítulo.`,
                      `Search covers the name of every setting, group, and chapter.`,
                      `La búsqueda cubre el nombre de cada ajuste, grupo y capítulo.`
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
        <button
          type="button"
          onClick={onClose}
          aria-label={tr("Fechar configurações", "Close settings", "Cerrar configuración")}
          className="ml-settings-field absolute right-5 top-5 rounded-xl border p-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
