import { useState, useEffect, useCallback } from "react";
import type { JournalDescriptor } from "../domain/journal.types";
import type { LibraryData } from "../domain/library-service";
import { loadLibrary, saveLibrary } from "../domain/library-service";

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
    const next: LibraryData = {
      ...library,
      journals: [...library.journals, journal],
      activeJournalId: journal.id,
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

  return {
    journals,
    activeJournalId,
    activeJournal,
    selectJournal,
    addJournal,
    removeJournal,
    loading: library === null,
  };
}
