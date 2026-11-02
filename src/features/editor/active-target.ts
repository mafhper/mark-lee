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

/**
 * Same idea as the tracker adjuster, for toggling an entry's favorite flag from
 * outside the editor panel (e.g. the entry-list context menu). Routes through the
 * open draft when that entry is active so a debounced autosave can't revert it;
 * returns false when a different entry (or none) is open so the caller can fall
 * back to a direct disk write.
 */
type EntryFavoriteToggler = (entryId: string) => boolean;
let entryFavoriteToggler: EntryFavoriteToggler | null = null;

export function setEntryFavoriteToggler(fn: EntryFavoriteToggler | null): void {
  entryFavoriteToggler = fn;
}

export function toggleActiveEntryFavorite(entryId: string): boolean {
  return entryFavoriteToggler ? entryFavoriteToggler(entryId) : false;
}
