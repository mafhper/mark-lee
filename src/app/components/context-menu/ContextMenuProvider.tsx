import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { ThemeConfig } from "../../../types";
import ContextMenu from "./ContextMenu";
import type {
  ContextMenuCloseReason,
  ContextMenuEntry,
  ContextMenuState,
  OpenContextMenuOptions,
} from "./types";

interface ContextMenuContextValue {
  openContextMenu: (options: OpenContextMenuOptions) => void;
  closeContextMenu: (reason: ContextMenuCloseReason) => void;
  isContextMenuOpen: boolean;
  registerTheme: (tConfig: ThemeConfig) => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

interface ContextMenuProviderProps {
  children: React.ReactNode;
  themeConfig: ThemeConfig;
  onActionError?: (error: unknown) => void;
}

const ContextMenuProvider: React.FC<ContextMenuProviderProps> = ({
  children,
  themeConfig,
  onActionError,
}) => {
  const [state, setState] = useState<ContextMenuState | null>(null);
  const themeRef = useRef<ThemeConfig>(themeConfig);
  themeRef.current = themeConfig;

  const closeContextMenu = useCallback((reason: ContextMenuCloseReason) => {
    setState((current) => {
      if (!current) return null;
      if (reason === "escape") {
        const element = current.sourceElement;
        if (element && typeof element.isConnected === "boolean" && element.isConnected) {
          try {
            element.focus();
          } catch {
            // ignore
          }
        }
      }
      return null;
    });
  }, []);

  const openContextMenu = useCallback(
    (options: OpenContextMenuOptions) => {
      setState((current) => {
        if (current) {
          // substitui o menu anterior sem restaurar foco
        }
        return {
          anchor: options.anchor,
          items: options.items,
          sourceElement: options.sourceElement ?? null,
        };
      });
    },
    []
  );

  const handleExecute = useCallback(
    async (entry: ContextMenuEntry) => {
      if (entry.type !== "item") return;
      // Fecha imediatamente com razão "select": o comando decide se devolve foco.
      setState(null);
      try {
        await entry.onSelect();
      } catch (error) {
        if (onActionError) {
          onActionError(error);
        } else {
          // eslint-disable-next-line no-console
          console.error("ContextMenu action failed:", error);
        }
      }
    },
    [onActionError]
  );

  const handleClose = useCallback(
    (reason: ContextMenuCloseReason) => {
      closeContextMenu(reason);
    },
    [closeContextMenu]
  );

  const registerTheme = useCallback((tConfig: ThemeConfig) => {
    themeRef.current = tConfig;
  }, []);

  const value = useMemo<ContextMenuContextValue>(
    () => ({
      openContextMenu,
      closeContextMenu,
      isContextMenuOpen: state !== null,
      registerTheme,
    }),
    [openContextMenu, closeContextMenu, state, registerTheme]
  );

  return (
    <ContextMenuContext.Provider value={value}>
      {children}
      <ContextMenu
        open={state !== null}
        anchor={state?.anchor ?? null}
        items={state?.items ?? []}
        sourceElement={state?.sourceElement ?? null}
        tConfig={themeRef.current}
        onClose={handleClose}
        onExecute={handleExecute}
      />
    </ContextMenuContext.Provider>
  );
};

export function useContextMenu(): ContextMenuContextValue {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) {
    throw new Error("useContextMenu deve ser usado dentro de <ContextMenuProvider>");
  }
  return ctx;
}

export default ContextMenuProvider;
