// A location filter selected from the Lugares tree. Clicking a place narrows
// the same rich entry list (instead of the tree being its own parallel,
// disconnected way to browse) — see vB Frente E.
export interface LocationFilter {
  field: "country" | "state" | "city";
  value: string;
}

/** Does an entry fall under this location filter? Mirrors buildTree's grouping
 *  (a missing country is bucketed as "Unknown"). */
export function entryMatchesLocation(
  location: { country?: string; state?: string; city?: string } | undefined,
  filter: LocationFilter,
): boolean {
  if (!location) return false;
  if (filter.field === "country") return (location.country || "Unknown") === filter.value;
  return location[filter.field] === filter.value;
}
