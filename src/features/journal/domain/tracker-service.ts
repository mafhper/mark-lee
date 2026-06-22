import type { TrackerDefinition, JournalManifest } from "./journal.types";
import { readManifest, writeManifest } from "./manifest-service";

export async function getTrackerDefinitions(rootPath: string): Promise<TrackerDefinition[]> {
  const manifest = await readManifest(rootPath);
  return manifest?.trackerDefinitions ?? [];
}

export async function setTrackerDefinitions(rootPath: string, definitions: TrackerDefinition[]): Promise<void> {
  const manifest = await readManifest(rootPath);
  if (!manifest) throw new Error("Manifest not found");
  const updated: JournalManifest = { ...manifest, trackerDefinitions: definitions };
  await writeManifest(rootPath, updated);
}

export async function addTrackerDefinition(rootPath: string, def: TrackerDefinition): Promise<void> {
  const current = await getTrackerDefinitions(rootPath);
  if (current.some((d) => d.id === def.id)) throw new Error(`Tracker "${def.id}" already exists`);
  await setTrackerDefinitions(rootPath, [...current, def]);
}

export async function removeTrackerDefinition(rootPath: string, id: string): Promise<void> {
  const current = await getTrackerDefinitions(rootPath);
  await setTrackerDefinitions(rootPath, current.filter((d) => d.id !== id));
}

export async function updateTrackerDefinition(rootPath: string, id: string, def: Partial<TrackerDefinition>): Promise<void> {
  const current = await getTrackerDefinitions(rootPath);
  const idx = current.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error(`Tracker "${id}" not found`);
  current[idx] = { ...current[idx], ...def };
  await setTrackerDefinitions(rootPath, current);
}
