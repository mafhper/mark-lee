import type { JournalDescriptor } from "./journal.types.ts";

function recency(journal: JournalDescriptor): number {
  const value = Date.parse(journal.lastOpenedAt ?? journal.createdAt);
  return Number.isFinite(value) ? value : 0;
}

export function orderJournalsForNavigation(
  journals: JournalDescriptor[],
  activeJournalId: string | null,
): JournalDescriptor[] {
  return journals
    .map((journal, index) => ({ journal, index }))
    .sort((left, right) => {
      const leftActive = left.journal.id === activeJournalId;
      const rightActive = right.journal.id === activeJournalId;
      if (leftActive !== rightActive) return leftActive ? -1 : 1;
      const byRecency = recency(right.journal) - recency(left.journal);
      return byRecency || left.index - right.index;
    })
    .map(({ journal }) => journal);
}
