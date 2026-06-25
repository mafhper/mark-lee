import { useMemo, useState } from "react";
import { MapPin, Globe, ChevronRight, ChevronDown, Map as MapIcon } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { EntryRecord } from "../domain/entry-service";
import { JournalEmptyState } from "./JournalEmptyState";

interface JournalMapViewProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  entries: EntryRecord[];
  onSelectEntry: (entry: EntryRecord) => void;
  /** When set, shows a "view on map" toggle that drives the world map in the canvas. */
  worldMapActive?: boolean;
  onToggleWorldMap?: () => void;
}

interface LocationGroup {
  key: string;
  label: string;
  children: LocationGroup[] | EntryRecord[];
  count: number;
}

function buildTree(entries: EntryRecord[]): LocationGroup[] {
  const tree: LocationGroup[] = [];

  for (const e of entries) {
    const loc = e.metadata.location;
    if (!loc) continue;

    const country = loc.country || "Unknown";
    const state = loc.state || "";
    const city = loc.city || "";

    let countryGroup = tree.find((g) => g.key === country);
    if (!countryGroup) {
      countryGroup = { key: country, label: country, children: [], count: 0 };
      tree.push(countryGroup);
    }
    countryGroup.count++;

      if (state) {
        const stateKey = `${country}|${state}`;
        let stateGroup = countryGroup.children.find((g) => (g as LocationGroup).key === stateKey) as LocationGroup | undefined;
        if (!stateGroup) {
          stateGroup = { key: stateKey, label: state, children: [], count: 0 };
          (countryGroup.children as LocationGroup[]).push(stateGroup);
        }
        stateGroup.count++;

        if (city) {
          const cityKey = `${stateKey}|${city}`;
          let cityGroup = stateGroup.children.find((g) => (g as LocationGroup).key === cityKey) as LocationGroup | undefined;
          if (!cityGroup) {
            cityGroup = { key: cityKey, label: city, children: [], count: 0 };
            (stateGroup.children as LocationGroup[]).push(cityGroup);
          }
          cityGroup.count++;
          (cityGroup.children as EntryRecord[]).push(e);
        } else {
          (stateGroup.children as EntryRecord[]).push(e);
        }
      } else if (city) {
        const cityKey = `${country}|${city}`;
        let cityGroup = countryGroup.children.find((g) => (g as LocationGroup).key === cityKey) as LocationGroup | undefined;
        if (!cityGroup) {
          cityGroup = { key: cityKey, label: city, children: [], count: 0 };
          (countryGroup.children as LocationGroup[]).push(cityGroup);
        }
        cityGroup.count++;
        (cityGroup.children as EntryRecord[]).push(e);
      } else {
        (countryGroup.children as EntryRecord[]).push(e);
      }
  }

  return tree;
}

function LocationEntryCard({ entry, tConfig, onSelectEntry }: { entry: EntryRecord; tConfig: ThemeConfig; onSelectEntry: (e: EntryRecord) => void }) {
  const loc = entry.metadata.location!;
  const parts = [loc.city, loc.state, loc.country].filter(Boolean);
  return (
    <button type="button" onClick={() => onSelectEntry(entry)}
      className="w-full flex items-start gap-2 p-2 rounded border text-left transition-colors hover:opacity-80"
      style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.accentHex + "04" }}>
      <MapPin size={12} className="shrink-0 mt-0.5" style={{ color: tConfig.accentHex }} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate" style={{ color: tConfig.fgHex }}>
          {entry.metadata.title || "Untitled"}
        </p>
        <p className="text-[10px] truncate" style={{ color: tConfig.fgHex + "50" }}>{loc.label}</p>
        {parts.length > 0 && (
          <p className="text-[9px] truncate" style={{ color: tConfig.fgHex + "35" }}>{parts.join(", ")}</p>
        )}
        {loc.latitude !== undefined && loc.longitude !== undefined && (
          <p className="text-[9px] font-mono" style={{ color: tConfig.fgHex + "25" }}>
            {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
          </p>
        )}
      </div>
    </button>
  );
}

function TreeNode({ group, depth, tConfig, onSelectEntry }: {
  group: LocationGroup;
  depth: number;
  tConfig: ThemeConfig;
  onSelectEntry: (e: EntryRecord) => void;
}) {
  const [collapsed, setCollapsed] = useState(depth >= 2);
  const isLeaf = group.children.length > 0 && "metadata" in group.children[0];
  const hasChildren = group.children.length > 0 && !isLeaf;

  return (
    <div>
      <button type="button" onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-1.5 py-1 text-left transition-colors hover:opacity-80"
        style={{ paddingLeft: `${8 + depth * 12}px` }}>
        {hasChildren ? (
          collapsed ? <ChevronRight size={10} style={{ color: tConfig.fgHex + "40" }} />
            : <ChevronDown size={10} style={{ color: tConfig.fgHex + "40" }} />
        ) : (
          <span className="w-[10px]" />
        )}
        <span className="text-[11px] font-medium truncate" style={{ color: tConfig.fgHex }}>
          {group.label}
        </span>
        <span className="text-[9px] ml-auto shrink-0" style={{ color: tConfig.fgHex + "40" }}>
          {group.count}
        </span>
      </button>
      {!collapsed && group.children.map((child) => {
        if ("metadata" in child) {
          return <LocationEntryCard key={child.metadata.id} entry={child} tConfig={tConfig} onSelectEntry={onSelectEntry} />;
        }
        return <TreeNode key={(child as LocationGroup).key} group={child as LocationGroup} depth={depth + 1} tConfig={tConfig} onSelectEntry={onSelectEntry} />;
      })}
    </div>
  );
}

export function JournalMapView({ t, tConfig, entries, onSelectEntry, worldMapActive, onToggleWorldMap }: JournalMapViewProps) {
  const locatedEntries = useMemo(() => entries.filter((e) => e.metadata.location), [entries]);
  const tree = useMemo(() => buildTree(locatedEntries), [locatedEntries]);
  // How many located entries actually have coordinates (so they appear on the
  // map) vs. only a textual place — the map looking "empty" is usually this gap.
  const withCoords = useMemo(
    () => locatedEntries.filter((e) => {
      const lat = e.metadata.location?.latitude;
      const lng = e.metadata.location?.longitude;
      return Number.isFinite(lat) && Number.isFinite(lng);
    }).length,
    [locatedEntries],
  );
  const withoutCoords = locatedEntries.length - withCoords;

  if (locatedEntries.length === 0) {
    return (
      <JournalEmptyState
        icon={<MapPin size={36} />}
        title={t["journal.places"] || "Places"}
        description={t["journal.emptyStateMap"] || "Entries with a location will appear here.\nAdd a place to an entry to see it on the map."}
        tConfig={tConfig}
      />
    );
  }

  const countries = tree.length;
  return (
    <div className="flex flex-col h-full">
      <div className="border-b sticky top-0 z-10"
        style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.uiHex }}>
        <div className="px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 text-[11px] font-semibold" style={{ color: tConfig.fgHex + "70" }}>
            <Globe size={13} className="shrink-0" style={{ color: tConfig.accentHex }} />
            <span className="truncate">
              {locatedEntries.length} {t["journal.locations"] || "locations"}
              {countries > 1 ? ` · ${countries} ${t["journal.countries"] || "countries"}` : ""}
            </span>
          </div>
          {onToggleWorldMap && (
            <button type="button" onClick={onToggleWorldMap}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0"
              style={{
                backgroundColor: worldMapActive ? tConfig.accentHex + "1F" : tConfig.bgHex,
                color: worldMapActive ? tConfig.accentHex : tConfig.fgHex + "80",
                border: `1px solid ${worldMapActive ? tConfig.accentHex + "55" : tConfig.uiBorderHex}`,
              }}
              aria-pressed={worldMapActive} title={t["journal.viewOnMap"] || "View on map"}>
              <MapIcon size={13} /> {t["journal.viewOnMap"] || "View on map"}
            </button>
          )}
        </div>
        <div className="px-3 pb-1.5 text-[10px]" style={{ color: tConfig.fgHex + "55" }}>
          {withCoords} {t["journal.withCoordinates"] || "on map"} · {withoutCoords} {t["journal.withoutCoordinates"] || "without coordinates"}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {tree.map((group) => (
          <div key={group.key} className="rounded-lg border" style={{ borderColor: tConfig.uiBorderHex }}>
            <TreeNode group={group} depth={0} tConfig={tConfig} onSelectEntry={onSelectEntry} />
          </div>
        ))}
      </div>
    </div>
  );
}
