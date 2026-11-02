import { readUserDataFile, writeUserDataFile, atomicWriteText, getUserDataPath, ensureDirectoryTree } from "../../../services/filesystem";
import { createSerialWrites } from "../../../services/serialWrites";
import { isTauriRuntime } from "../../../services/runtime";
import { readManifest } from "./manifest-service";
import type { JournalDescriptor } from "./journal.types";

const LIBRARY_FILE = "journal-library.json";
const LIBRARY_BACKUP = "journal-library.json.bak";
const LIBRARY_CORRUPT = "journal-library.corrupt.json";

/**
 * Fila da biblioteca, uma só para o arquivo inteiro (H05).
 *
 * `saveLibrary` grava duas vezes (backup e principal) e os três mutadores fazem
 * "carregar lista → mutar → gravar". Sem a fila, dois cliques em cadernos
 * diferentes perdiam um deles e um backup podia ser escrito no meio do par
 * backup/principal que deveria ser uma transição.
 *
 * As funções internas (`persistLibrary`) **não** pegam a fila: a trava é do
 * chamador público, e enfileirar de dentro de uma tarefa já enfileirada
 * esperaria por si mesma para sempre.
 */
const libraryWrites = createSerialWrites();

function emptyLibrary(): LibraryData {
  return { version: 1, journals: [], activeJournalId: null };
}

interface LibraryData {
  version: 1;
  journals: JournalDescriptor[];
  activeJournalId: string | null;
}

/** Validate journals against their on-disk manifests, marking missing ones unavailable. */
async function normalizeLibrary(parsed: unknown): Promise<LibraryData> {
  if (!parsed || typeof parsed !== "object") return emptyLibrary();
  const obj = parsed as Record<string, unknown>;
  const journals: JournalDescriptor[] = Array.isArray(obj.journals) ? obj.journals : [];
  const validJournals = await Promise.all(
    journals.map(async (j) => {
      const manifest = await readManifest(j.rootPath);
      if (!manifest) {
        return { ...j, name: j.name || "Unavailable", unavailable: true };
      }
      return { ...j, name: manifest.name, description: manifest.description, color: manifest.color, cover: manifest.cover, unavailable: false };
    })
  );
  const storedActiveId = typeof obj.activeJournalId === "string" ? obj.activeJournalId : null;
  const activeJournal = validJournals.find((journal) => journal.id === storedActiveId && !journal.unavailable);
  const fallbackJournal = validJournals.find((journal) => !journal.unavailable);
  return {
    version: 1,
    journals: validJournals,
    activeJournalId: activeJournal?.id ?? fallbackJournal?.id ?? null,
  };
}

/** Read and parse a user-data file, or null if absent/unreadable/corrupt. */
async function tryLoadLibraryFile(fileName: string): Promise<LibraryData | null> {
  let raw: string | null;
  try {
    raw = await readUserDataFile(fileName);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return await normalizeLibrary(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Load the library, distinguishing absent / inaccessible / corrupt:
 *  - absent → fresh empty library (first run);
 *  - inaccessible (read throws) → empty, without touching the file;
 *  - corrupt → recover from the rolling backup, else preserve the bad file as
 *    `*.corrupt.json` for manual recovery and start empty (never silently lose it).
 */
export async function loadLibrary(): Promise<LibraryData> {
  let raw: string | null;
  try {
    raw = await readUserDataFile(LIBRARY_FILE);
  } catch {
    // Inaccessible (permission/IO). Don't write anything that could clobber a
    // file that may still exist but is momentarily unreadable.
    return emptyLibrary();
  }
  if (raw === null) return emptyLibrary(); // absent → fresh start

  try {
    return await normalizeLibrary(JSON.parse(raw));
  } catch {
    // Main file is corrupt. Prefer the backup if it is intact.
    const recovered = await tryLoadLibraryFile(LIBRARY_BACKUP);
    if (recovered) return recovered;
    // No usable backup: keep the corrupt bytes for manual recovery and continue.
    try { await writeLibraryFile(LIBRARY_CORRUPT, raw); } catch { /* best effort */ }
    return emptyLibrary();
  }
}

/**
 * Grava um arquivo da biblioteca pelo primitivo seguro.
 *
 * **Por que o backup também passa por aqui:** o backup é o que salva a biblioteca
 * quando o principal corrompe — deixá-lo no caminho direto seria protegê-la por
 * um arquivo que pode ser truncado no meio da própria gravação. No desktop a
 * troca é atômica (temporário único + rename do `safe_write`); no navegador não
 * existe diretório de dados, e o `localStorage` é a única implementação possível.
 */
async function writeLibraryFile(fileName: string, content: string): Promise<void> {
  if (isTauriRuntime()) {
    const base = await getUserDataPath();
    await ensureDirectoryTree(base);
    await atomicWriteText(`${base}/${fileName}`, content);
    return;
  }
  await writeUserDataFile(fileName, content);
}

/** Grava backup + principal do conteúdo recebido. Não pega a fila: é o miolo. */
async function persistLibrary(data: LibraryData): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  // Back up the previous content first, but only if it parses — so a corrupt main
  // file can never overwrite a healthy backup.
  try {
    const prev = await readUserDataFile(LIBRARY_FILE);
    if (prev) { JSON.parse(prev); await writeLibraryFile(LIBRARY_BACKUP, prev); }
  } catch { /* nothing to back up (missing or unparseable) */ }
  await writeLibraryFile(LIBRARY_FILE, content);
}

export async function saveLibrary(data: LibraryData): Promise<void> {
  await libraryWrites.run(LIBRARY_FILE, () => persistLibrary(data));
}

export async function addJournal(journal: JournalDescriptor): Promise<void> {
  await libraryWrites.run(LIBRARY_FILE, async () => {
    const library = await loadLibrary();
    const existing = library.journals.find((j) => j.id === journal.id);
    if (existing) {
      // Update existing journal
      Object.assign(existing, journal);
      existing.unavailable = false;
    } else {
      library.journals.push(journal);
    }
    library.activeJournalId = journal.id;
    await persistLibrary(library);
  });
}

export async function removeJournal(journalId: string): Promise<void> {
  await libraryWrites.run(LIBRARY_FILE, async () => {
    const library = await loadLibrary();
    library.journals = library.journals.filter((j) => j.id !== journalId);
    if (library.activeJournalId === journalId) {
      library.activeJournalId = library.journals[0]?.id ?? null;
    }
    await persistLibrary(library);
  });
}

export async function setActiveJournal(journalId: string | null): Promise<void> {
  await libraryWrites.run(LIBRARY_FILE, async () => {
    const library = await loadLibrary();
    library.activeJournalId = journalId;
    await persistLibrary(library);
  });
}

export { LIBRARY_FILE };
export type { LibraryData };
