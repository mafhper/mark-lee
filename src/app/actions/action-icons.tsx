import type React from "react";
import {
  BookOpen,
  Bold,
  Braces,
  CheckSquare,
  Clock,
  Code,
  Columns2,
  Download,
  Eye,
  FileInput,
  FilePlus2,
  FileText,
  Files,
  Focus,
  FolderOpen,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Palette,
  PanelLeft,
  Pencil,
  PenLine,
  Redo2,
  Replace,
  Save,
  ScanSearch,
  Search,
  Settings2,
  Square,
  Undo2,
  X,
} from "lucide-react";
import DualToneIcon from "../components/DualToneIcon";

/**
 * A fonte única do ícone de cada ação.
 *
 * Existiam **três listas de ações** — a barra, o menu e a paleta — e nenhuma era a
 * fonte (nota MKL-N13). AMKL-N13: o ícone é a symptom mais visível dessa
 * divergência, porque a mesma ação aparece com duas gravuras em duas superfícies da
 * mesma tela.
 *
 * Este módulo é o começo da fonte única: `action -> ícone`, num lugar só, para o
 * menu e a barra lerem. O ícone do menu **é** o ícone da barra, e não uma escolha
 * nova — a lista abaixo copia o que a barra já usava, para que os dois campos
 * fiquem iguais sem dependerem um do outro na tela.
 *
 * Por que o mapa é de `action` e não de `id` de palette: `action` é o que os três
 * menus, a barra e o despacho de atalhos compartilham. É o identificador que
 * realmente atravessa as superfícies.
 *
 * A entrada é o **componente** do lucide, não o SVG pronto, porque a barra
 * envolve em `DualToneIcon` e o menu precisa do mesmo tratamento — um `<Save>`
 * nu no menu e um duotone na barra seriam duas gravuras da mesma ação, que é
 * justamente o defeito.
 */

export type ActionId =
  | "file-new"
  | "file-open"
  | "file-open-folder"
  | "file-open-recent"
  | "file-save"
  | "file-save-as"
  | "file-export"
  | "file-rename"
  | "edit-undo"
  | "edit-redo"
  | "edit-find"
  | "edit-find-advanced"
  | "tool-format"
  | "tool-minify"
  | "edit-replace"
  | "edit-snippets"
  | "fmt-bold"
  | "fmt-italic"
  | "fmt-link"
  | "fmt-ul"
  | "fmt-ol"
  | "fmt-task"
  | "view-sidebar"
  | "view-edit"
  | "view-split"
  | "view-preview"
  | "view-zen"
  | "view-theme-cycle"
  | "view-journal"
  | "app-settings"
  | "window-minimize"
  | "window-maximize"
  | "window-close";

/**
 * Ícone por ação. Onde a barra já tinha um ícone, ele foi copiado — a fonte é a
 * barra, e o menu passa a mostrar o mesmo desenho.
 */
export const ACTION_ICONS: Record<ActionId, typeof FilePlus2> = {
  "file-new": FilePlus2,
  "file-open": FileInput,
  "file-open-folder": FolderOpen,
  "file-open-recent": Clock,
  "file-save": Save,
  "file-save-as": Files,
  "file-export": Download,
  "file-rename": Pencil,
  "edit-undo": Undo2,
  "edit-redo": Redo2,
  "edit-find": Search,
  "edit-find-advanced": ScanSearch,
  "edit-replace": Replace,
  "edit-snippets": Braces,
  // As duas transformacoes de Markdown, que moravam so na faixa.
  "tool-format": FileText,
  "tool-minify": Code,
  "fmt-bold": Bold,
  "fmt-italic": Italic,
  "fmt-link": Link,
  "fmt-ul": List,
  "fmt-ol": ListOrdered,
  "fmt-task": CheckSquare,
  "view-sidebar": PanelLeft,
  "view-edit": PenLine,
  "view-split": Columns2,
  "view-preview": Eye,
  "view-zen": Focus,
  "view-theme-cycle": Palette,
  "view-journal": BookOpen,
  "app-settings": Settings2,
  "window-minimize": Minus,
  "window-maximize": Square,
  "window-close": X,
};

/** `true` quando a ação tem ícone conhecido. Uma ação sem entrada é um bug de mapa. */
export function temIconeDeAcao(action: string): boolean {
  return Object.prototype.hasOwnProperty.call(ACTION_ICONS, action);
}

/**
 * O ícone da ação, ou `null` quando não há — o menu então **não reserva a calha**,
 * e o rótulo fica alinhado à esquerda como sempre. Reservar espaço para um ícone
 * que não existe empurraria o texto à toa.
 */
export function iconeDeAcao(action: string | undefined, size = 14): React.ReactElement | null {
  if (!action) return null;
  const Icon = ACTION_ICONS[action as ActionId];
  if (!Icon) return null;
  return <DualToneIcon icon={Icon} size={size} />;
}