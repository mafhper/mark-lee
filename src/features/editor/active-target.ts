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
