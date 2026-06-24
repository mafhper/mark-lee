import { useState, useEffect, useCallback } from "react";
import type { JournalDescriptor } from "../domain/journal.types";
import type { LibraryData } from "../domain/library-service";
import { loadLibrary, saveLibrary } from "../domain/library-service";
import { updateManifestId } from "../domain/manifest-service";

/** Case/separator-insensitive path key (Windows folders are case-insensitive). */
function pathKey(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

/** Raised when a copied notebook's duplicate manifest id could not be rewritten. */
export class DuplicateIdRewriteError extends Error {
  constructor(public readonly rootPath: string) {
    super(`Could not rewrite the duplicate notebook id at ${rootPath}`);
    this.name = "DuplicateIdRewriteError";
  }
}

export function useJournalLibrary() {
  const [library, setLibrary] = useState<LibraryData | null>(null);

  useEffect(() => {
    loadLibrary().then(setLibrary);
  }, []);

  const journals = library?.journals ?? [];
  const activeJournalId = library?.activeJournalId ?? null;

  const selectJournal = useCallback(async (journalId: string | null) => {
    if (!library) return;
    const next: LibraryData = { ...library, activeJournalId: journalId };
    setLibrary(next);
    await saveLibrary(next);
  }, [library]);

  const addJournal = useCallback(async (journal: JournalDescriptor) => {
    if (!library) return;

    // Re-adding the same folder (case-insensitive) → update it in place, don't duplicate.
    const samePath = library.journals.find((j) => pathKey(j.rootPath) === pathKey(journal.rootPath));
    if (samePath) {
      const journals = library.journals.map((j) =>
        j.id === samePath.id ? { ...j, ...journal, id: samePath.id, unavailable: false } : j,
      );
      const next: LibraryData = { ...library, journals, activeJournalId: samePath.id };
      setLibrary(next);
      await saveLibrary(next);
      return;
    }

    // Different folder but the id already exists → it's a copy of another notebook
    // (duplicated manifest id). Give this one a fresh id and rewrite its manifest.
    let entry = journal;
    if (library.journals.some((j) => j.id === journal.id)) {
      const newId = crypto.randomUUID();
      // The library id and the on-disk manifest id must stay in sync. If the
      // manifest can't be rewritten we must not proceed: adopting newId would
      // diverge the two, and keeping the old id would put two notebooks with the
      // same id in the library (breaking every id-based lookup). Abort instead.
      try {
        await updateManifestId(journal.rootPath, newId);
      } catch {
        throw new DuplicateIdRewriteError(journal.rootPath);
      }
      entry = { ...journal, id: newId };
    }

    const next: LibraryData = {
      ...library,
      journals: [...library.journals, entry],
      activeJournalId: entry.id,
    };
    setLibrary(next);
    await saveLibrary(next);
  }, [library]);

  const removeJournal = useCallback(async (journalId: string) => {
    if (!library) return;
    const nextJournals = library.journals.filter((j) => j.id !== journalId);
    const next: LibraryData = {
      ...library,
      journals: nextJournals,
      activeJournalId: library.activeJournalId === journalId ? (nextJournals[0]?.id ?? null) : library.activeJournalId,
    };
    setLibrary(next);
    await saveLibrary(next);
  }, [library]);

  const activeJournal = journals.find((j) => j.id === activeJournalId) ?? null;

  const reload = useCallback(async () => {
    const data = await loadLibrary();
    setLibrary(data);
  }, []);

  return {
    journals,
    activeJournalId,
    activeJournal,
    selectJournal,
    addJournal,
    removeJournal,
    reload,
    loading: library === null,
  };
}
