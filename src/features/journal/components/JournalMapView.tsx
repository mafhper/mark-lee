import { MapPin } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import { JournalEmptyState } from "./JournalEmptyState";

interface JournalMapViewProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
}

export function JournalMapView({ t, tConfig }: JournalMapViewProps) {
  return (
    <JournalEmptyState
      icon={<MapPin size={36} />}
      title={t["journal.map"] || "Map"}
      description={t["journal.emptyStateMap"] || "Entries with a location will appear here.\nAdd a place to an entry to see it on the map."}
      tConfig={tConfig}
    />
  );
}
