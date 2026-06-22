import { readUserDataFile, writeUserDataFile } from "../../../services/filesystem";
import type { JournalDescriptor } from "./journal.types";

const LIBRARY_FILE = "journal-library.json";

interface LibraryData {
  version: 1;
  journals: JournalDescriptor[];
  activeJournalId: string | null;
}

function emptyLibrary(): LibraryData {
  return { version: 1, journals: [], activeJournalId: null };
}

export async function loadLibrary(): Promise<LibraryData> {
  try {
    const raw = await readUserDataFile(LIBRARY_FILE);
    if (!raw) return emptyLibrary();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyLibrary();
    return {
      version: parsed.version ?? 1,
      journals: Array.isArray(parsed.journals) ? parsed.journals : [],
      activeJournalId: typeof parsed.activeJournalId === "string" ? parsed.activeJournalId : null,
    };
  } catch {
    return emptyLibrary();
  }
}

export async function saveLibrary(data: LibraryData): Promise<void> {
  await writeUserDataFile(LIBRARY_FILE, JSON.stringify(data, null, 2));
}

export async function addJournal(journal: JournalDescriptor): Promise<void> {
  const library = await loadLibrary();
  library.journals.push(journal);
  library.activeJournalId = journal.id;
  await saveLibrary(library);
}

export async function removeJournal(journalId: string): Promise<void> {
  const library = await loadLibrary();
  library.journals = library.journals.filter((j) => j.id !== journalId);
  if (library.activeJournalId === journalId) {
    library.activeJournalId = library.journals[0]?.id ?? null;
  }
  await saveLibrary(library);
}

export async function setActiveJournal(journalId: string | null): Promise<void> {
  const library = await loadLibrary();
  library.activeJournalId = journalId;
  await saveLibrary(library);
}

export { LIBRARY_FILE };
export type { LibraryData };
