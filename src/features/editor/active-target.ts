export interface ActiveDocumentTarget {
  kind: "editor-tab" | "journal-entry";
  save(): Promise<void>;
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
 */
type FlushHandler = () => void | Promise<void>;
const flushHandlers = new Set<FlushHandler>();

export function registerFlushHandler(handler: FlushHandler): () => void {
  flushHandlers.add(handler);
  return () => {
    flushHandlers.delete(handler);
  };
}

export async function flushAllPending(): Promise<void> {
  await Promise.all(
    [...flushHandlers].map((handler) =>
      Promise.resolve()
        .then(handler)
        .catch(() => {
          /* best-effort flush; never block shutdown on a single failure */
        }),
    ),
  );
}
