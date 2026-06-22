import React, { useRef, useState } from "react";
import { Trash2, Pencil, Copy, Scissors, Clipboard } from "lucide-react";
import { Theme, ThemeConfig } from "../../../types";
import { THEMES } from "../../../constants";
import {
  ContextMenuProvider,
  useContextMenuTrigger,
  type ContextMenuAnchor,
  type ContextMenuEntry,
} from "./index";

const THEME_CONFIG: ThemeConfig = THEMES[Theme.Golden];

const buildItems = (label: string, withDisabled = false): ContextMenuEntry[] => [
  {
    type: "item",
    id: "cut",
    label: `Cortar (${label})`,
    icon: <Scissors size={13} />,
    shortcut: "Ctrl+X",
    onSelect: () => {
      // no-op
    },
  },
  {
    type: "item",
    id: "copy",
    label: `Copiar (${label})`,
    icon: <Copy size={13} />,
    shortcut: "Ctrl+C",
    onSelect: () => {
      // no-op
    },
  },
  {
    type: "item",
    id: "paste",
    label: "Colar",
    icon: <Clipboard size={13} />,
    shortcut: "Ctrl+V",
    onSelect: () => {
      // no-op
    },
  },
  { type: "separator", id: "sep1" },
  {
    type: "item",
    id: "rename",
    label: "Renomear",
    icon: <Pencil size={13} />,
    onSelect: () => {
      // no-op
    },
  },
  {
    type: "item",
    id: "delete",
    label: "Excluir",
    icon: <Trash2 size={13} />,
    danger: true,
    onSelect: () => {
      // no-op
    },
  },
  { type: "separator", id: "sep2" },
  ...(withDisabled
    ? [
        {
          type: "item" as const,
          id: "disabled-undo",
          label: "Desfazer (desabilitado)",
          disabled: true,
          onSelect: () => {},
        },
      ]
    : []),
];

const Surface: React.FC<{
  label: string;
  className?: string;
  withDisabled?: boolean;
  resolveKeyboardAnchor?: (element: HTMLElement) => ContextMenuAnchor;
}> = ({ label, className, withDisabled, resolveKeyboardAnchor }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const { onContextMenu } = useContextMenuTrigger<HTMLDivElement>({
    ref,
    resolveItems: () => buildItems(label, withDisabled),
    resolveKeyboardAnchor,
  });

  return (
    <div
      ref={ref}
      tabIndex={0}
      onContextMenu={onContextMenu}
      className={`rounded-lg border p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${THEME_CONFIG.uiBorder} ${THEME_CONFIG.ui} ${THEME_CONFIG.fg} ${className ?? ""}`}
    >
      <div className="font-semibold mb-1">{label}</div>
      <div className="text-xs opacity-70">
        Clique direito aqui, ou Shift+F10 quando focado.
      </div>
    </div>
  );
};

const ContextMenuDevHarness: React.FC = () => {
  const [lastError, setLastError] = useState<string | null>(null);

  return (
    <ContextMenuProvider themeConfig={THEME_CONFIG} onActionError={(err) => setLastError(String(err))}>
      <div
        className="min-h-screen p-8"
        style={{ backgroundColor: THEME_CONFIG.bgHex, color: THEME_CONFIG.fgHex, fontFamily: THEME_CONFIG.uiFont }}
      >
        <h1 className="text-2xl font-bold mb-2">ContextMenu Dev Harness</h1>
        <p className="text-sm opacity-75 mb-6">
          Rota de desenvolvimento. Não aparece no build de produção. Use para validar
          portal, foco, teclado, clamping e razões de fechamento.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Surface label="Superfície 1" />
          <Surface label="Superfície 2 (com disabled)" withDisabled />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Surface label="Borda superior-esquerda" className="fixed top-2 left-2 w-40" />
          <Surface label="Borda superior-direita" className="fixed top-2 right-2 w-40" />
          <Surface label="Borda inferior-direita" className="fixed bottom-2 right-2 w-40" />
        </div>

        <div className="mb-6">
          <Surface
            label="Superfície com âncora de teclado customizada"
            resolveKeyboardAnchor={(element) => {
              const rect = element.getBoundingClientRect();
              return { type: "point", x: rect.left + rect.width / 2, y: rect.top + 20 };
            }}
          />
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Input sem menu customizado — menu nativo deve aparecer"
            className="w-full rounded border px-3 py-2 text-sm bg-transparent outline-none"
          />
          <p className="text-xs opacity-60 mt-1">
            Clique direito aqui deve mostrar o menu nativo (sem registro de trigger).
          </p>
        </div>

        {lastError && (
          <div className="rounded border border-rose-400 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
            Erro capturado: {lastError}
          </div>
        )}
      </div>
    </ContextMenuProvider>
  );
};

export default ContextMenuDevHarness;
