import { DEFAULT_SHORTCUTS, type ShortcutId } from "../../constants";

export function resolveCommandShortcut(
  shortcutId: ShortcutId | undefined,
  customShortcuts: Record<string, string> | undefined
): string | undefined {
  if (!shortcutId) return undefined;
  return customShortcuts?.[shortcutId] ?? DEFAULT_SHORTCUTS[shortcutId];
}
