export interface ActiveDocumentTarget {
  kind: "editor-tab" | "journal-entry";
  // Resolves to `false` when a pending save failed (journal entry); the editor
  // tab resolves to void. Callers that only trigger a save can ignore the value.
  save(): Promise<void | boolean>;
  find?(): void;
  export?(): void;
  format?(): void;
  minify?(): void;
}

export const activeTargetRef: { current: ActiveDocumentTarget | null } = { current: null };

export function setActiveTarget(target: ActiveDocumentTarget | null): void {
  activeTargetRef.current = target;
}

export function getActiveTarget(): ActiveDocumentTarget | null {
  return activeTargetRef.current;
}

/**
 * Registry of pending-save flushers. Components with debounced autosave (e.g. the
 * journal entry panel) register a flusher so the app can guarantee everything is
 * persisted before the window closes, regardless of which surface is mounted.
 *
 * A handler resolves to `false` (or throws) when its pending save could not be
 * persisted, so the caller can decide whether it is safe to proceed (e.g. close
 * the window) instead of silently losing edits.
 */
type FlushHandler = () => void | boolean | Promise<void | boolean>;
const flushHandlers = new Set<FlushHandler>();

export function registerFlushHandler(handler: FlushHandler): () => void {
  flushHandlers.add(handler);
  return () => {
    flushHandlers.delete(handler);
  };
}

export interface FlushResult {
  /** Number of registered flushers whose pending save failed (or threw). */
  failures: number;
}

export async function flushAllPending(): Promise<FlushResult> {
  const results = await Promise.all(
    [...flushHandlers].map((handler) =>
      Promise.resolve()
        .then(handler)
        .then(
          (ok) => ok !== false, // void/true → success; explicit false → failure
          () => false, // a thrown flusher is a failure
        ),
    ),
  );
  return { failures: results.filter((ok) => ok === false).length };
}

/**
 * Channel for routing a tracker quick-adjust (the Pins +/- buttons) through the
 * live entry draft when that entry is the one currently open in the editor panel.
 * The panel registers an adjuster; it returns `true` only when it owns the target
 * entry and applied the change to its in-memory draft (so a debounced autosave
 * cannot later clobber it). Callers fall back to a direct disk write when it
 * returns `false` (entry closed, or a different entry is active).
 */
type EntryTrackerAdjuster = (entryId: string, trackerId: string, delta: number) => boolean;
let entryTrackerAdjuster: EntryTrackerAdjuster | null = null;

export function setEntryTrackerAdjuster(fn: EntryTrackerAdjuster | null): void {
  entryTrackerAdjuster = fn;
}

export function adjustActiveEntryTracker(entryId: string, trackerId: string, delta: number): boolean {
  return entryTrackerAdjuster ? entryTrackerAdjuster(entryId, trackerId, delta) : false;
}
