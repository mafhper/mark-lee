export { JournalWorkspace } from "./JournalWorkspace";
export type { JournalManifest, JournalDescriptor } from "./domain/journal.types";
export { createManifestPayload, writeManifest, readManifest, validateManifest } from "./domain/manifest-service";
export { loadLibrary, saveLibrary, addJournal, removeJournal, setActiveJournal } from "./domain/library-service";
export type { LibraryData } from "./domain/library-service";
export { useJournalLibrary } from "./hooks/useJournalLibrary";
