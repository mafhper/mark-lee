import { useSyncExternalStore } from "react";
import { THEME_ORDER } from "@/aurora/theme-tokens";

/**
 * Qual dos doze temas o palco está mostrando — e por que não é aleatório.
 *
 * O palco abre num tema diferente a cada visita, rodando os doze na ordem. A
 * conta é determinística de propósito: sorteio quebraria screenshot, teste e a
 * memória de quem já viu o site ("caiu no mesmo tema de novo").
 *
 *  - com `localStorage`, um contador incrementa por visita;
 *  - sem storage (modo privado, cota, navegador sem a API), cai para
 *    `(dias desde epoch) mod 12` — ainda muda, ainda é previsível.
 *
 * O mesmo valor alimenta o seletor da seção de temas: o palco e o seletor nunca
 * discordam porque leem a mesma fonte. Trocar no seletor publica no palco na
 * hora, sem recarregar nada.
 */

const STORAGE_KEY = "mark-lee:stage-theme-visits";
const DAY_MS = 86_400_000;

/** O mínimo que a rotação precisa de um armazenamento. */
export interface VisitStore {
  /** `false` quando o armazenamento existe mas não guarda nada. */
  available: boolean;
  read(): number | null;
  write(value: number): void;
}

/** Sonda o armazenamento de verdade: `getItem` funcionar não quer dizer que `setItem` funcione. */
export function browserVisitStore(scope: Window | null): VisitStore {
  const storage = scope?.localStorage ?? null;

  let available = false;
  try {
    const probe = `${STORAGE_KEY}:probe`;
    storage?.setItem(probe, "1");
    storage?.removeItem(probe);
    available = Boolean(storage);
  } catch {
    available = false;
  }

  return {
    available,
    read: () => {
      try {
        const raw = storage?.getItem(STORAGE_KEY);
        if (raw === null || raw === undefined) return null;
        const value = Number.parseInt(raw, 10);
        return Number.isFinite(value) && value >= 0 ? value : null;
      } catch {
        return null;
      }
    },
    write: (value: number) => {
      try {
        storage?.setItem(STORAGE_KEY, String(Math.trunc(value)));
      } catch {
        /* sem storage: a próxima visita volta para o relógio */
      }
    },
  };
}

/** Índice do tema de uma visita. Conta negativa não existe, mas não quebra. */
export function themeIndexForVisit(visits: number, count: number): number {
  if (!Number.isFinite(visits) || count <= 0) return 0;
  return ((Math.trunc(visits) % count) + count) % count;
}

/** Sem armazenamento, o dia escolhe: um tema por dia, na ordem. */
export function themeIndexForClock(nowMs: number, count: number): number {
  return themeIndexForVisit(Math.floor(nowMs / DAY_MS), count);
}

/**
 * Consome uma visita e devolve o id do tema que o palco deve abrir.
 *
 * Primeira visita abre no primeiro tema; a décima terceira volta ao primeiro.
 * Sem armazenamento, nada é consumido: o relógio manda.
 */
export function nextStageTheme(
  store: VisitStore,
  nowMs: number = Date.now(),
  order: readonly string[] = THEME_ORDER,
): string {
  if (!store.available || order.length === 0) {
    return order[themeIndexForClock(nowMs, order.length)] ?? order[0];
  }

  const visits = store.read() ?? 0;
  store.write(visits + 1);
  return order[themeIndexForVisit(visits, order.length)];
}

/* ---------------------------------------------------------------------------
 * A fonte única, para React ler
 * ------------------------------------------------------------------------ */

/**
 * A visita é consumida no carregamento do módulo — uma vez por página, que é
 * exatamente o que "a cada carregamento" significa.
 */
const initialTheme =
  typeof window === "undefined" ? THEME_ORDER[0] : nextStageTheme(browserVisitStore(window));

let current = initialTheme;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** O tema atual — o mesmo para o palco e para o seletor. */
export function getStageTheme(): string {
  return current;
}

/** Troca o tema no palco e no seletor ao mesmo tempo. Ignora id desconhecido. */
export function setStageTheme(id: string): void {
  if (id === current || !THEME_ORDER.includes(id)) return;
  current = id;
  for (const listener of listeners) listener();
}

export function useStageTheme(): string {
  return useSyncExternalStore(subscribe, getStageTheme, getStageTheme);
}
