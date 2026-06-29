import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Globe, Image as ImageIcon, Map as MapIcon, MapPin } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import { loadImage } from "../../../services/filesystem";
import type { EntryRecord } from "../domain/entry-service";
import { resolveEntryAssetPath } from "../domain/export-paths";
import { JournalEmptyState } from "./JournalEmptyState";
import type { LocationFilter } from "../location/locationFilter";

interface JournalMapViewProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  entries: EntryRecord[];
  onSelectEntry: (entry: EntryRecord) => void;
  worldMapActive?: boolean;
  onToggleWorldMap?: () => void;
  onFilterLocation?: (filter: LocationFilter) => void;
}

interface PlaceGroup {
  key: string;
  title: string;
  subtitle: string;
  filter: LocationFilter;
  entries: EntryRecord[];
  withCoords: number;
  coverPath: string | null;
}

function entryHasCoords(entry: EntryRecord): boolean {
  const lat = entry.metadata.location?.latitude;
  const lng = entry.metadata.location?.longitude;
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function firstImagePath(entry: EntryRecord): string | null {
  if (entry.metadata.cover) {
    const cover = resolveEntryAssetPath(entry.path, entry.metadata.cover);
    if (cover) return cover;
  }
  const match = /!\[.*?\]\((.+?)\)/.exec(entry.body);
  return match ? resolveEntryAssetPath(entry.path, match[1]) : null;
}

function locationFilter(entry: EntryRecord): LocationFilter {
  const loc = entry.metadata.location;
  if (loc?.city) return { field: "city", value: loc.city };
  if (loc?.state) return { field: "state", value: loc.state };
  return { field: "country", value: loc?.country || "Unknown" };
}

function buildPlaces(entries: EntryRecord[]): PlaceGroup[] {
  const map = new Map<string, PlaceGroup>();
  for (const entry of entries) {
    const loc = entry.metadata.location;
    if (!loc) continue;
    const filter = locationFilter(entry);
    const key = `${filter.field}:${filter.value}`;
    const title = loc.attraction || loc.city || loc.state || loc.country || loc.label || "Unknown";
    const subtitle = [loc.label !== title ? loc.label : "", loc.city !== title ? loc.city : "", loc.state, loc.country]
      .filter(Boolean)
      .filter((value, index, list) => list.indexOf(value) === index)
      .join(", ");
    let group = map.get(key);
    if (!group) {
      group = { key, title, subtitle, filter, entries: [], withCoords: 0, coverPath: null };
      map.set(key, group);
    }
    group.entries.push(entry);
    if (entryHasCoords(entry)) group.withCoords += 1;
    if (!group.coverPath) group.coverPath = firstImagePath(entry);
  }
  return Array.from(map.values())
    .map((group) => ({
      ...group,
      entries: [...group.entries].sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime()),
    }))
    .sort((a, b) => b.entries.length - a.entries.length || a.title.localeCompare(b.title));
}

function PlaceCover({ path, tConfig }: { path: string | null; tConfig: ThemeConfig }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return () => { active = false; };
    }
    loadImage(path).then((next) => { if (active) setUrl(next); }).catch(() => { if (active) setUrl(null); });
    return () => { active = false; };
  }, [path]);

  return (
    <div className="relative h-24 w-full overflow-hidden rounded-md"
      style={{
        background: url
          ? tConfig.uiHex
          : `
            radial-gradient(circle at 76% 22%, ${tConfig.accentHex}30 0 18%, transparent 19%),
            radial-gradient(circle at 24% 72%, ${tConfig.fgHex}18 0 15%, transparent 16%),
            repeating-linear-gradient(30deg, transparent 0 18px, ${tConfig.fgHex}0B 19px 20px),
            linear-gradient(135deg, ${tConfig.accentHex}24, ${tConfig.uiHex})
          `,
      }}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : (
        <div className="absolute inset-0">
          <span className="absolute left-5 top-7 h-1.5 w-28 rotate-[-18deg] rounded-full opacity-45" style={{ backgroundColor: tConfig.accentHex }} />
          <span className="absolute right-3 top-12 h-1.5 w-24 rotate-[22deg] rounded-full opacity-35" style={{ backgroundColor: tConfig.fgHex }} />
          <span className="absolute left-20 bottom-5 h-1.5 w-32 rotate-[8deg] rounded-full opacity-35" style={{ backgroundColor: tConfig.accentHex }} />
          <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-black/18 backdrop-blur-sm"
            style={{ borderColor: tConfig.fgHex + "20", color: tConfig.fgHex }}>
            <MapPin size={18} />
          </span>
        </div>
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,.42))" }} />
    </div>
  );
}

function EntryRow({ entry, tConfig, onSelectEntry }: { entry: EntryRecord; tConfig: ThemeConfig; onSelectEntry: (entry: EntryRecord) => void }) {
  const loc = entry.metadata.location;
  const date = new Date(entry.metadata.date);
  return (
    <button type="button" onClick={() => onSelectEntry(entry)}
      className="w-full rounded-md px-2.5 py-2 text-left transition-colors hover:opacity-80"
      style={{ backgroundColor: tConfig.bgHex, border: `1px solid ${tConfig.uiBorderHex}` }}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: entryHasCoords(entry) ? tConfig.accentHex + "1F" : tConfig.fgHex + "10", color: entryHasCoords(entry) ? tConfig.accentHex : tConfig.fgHex + "55" }}>
          <MapPin size={11} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium" style={{ color: tConfig.fgHex }}>
            {entry.metadata.title || "Untitled"}
          </p>
          <p className="truncate text-[10px]" style={{ color: tConfig.fgHex + "58" }}>
            {date.toLocaleDateString()} {loc?.label ? `- ${loc.label}` : ""}
          </p>
        </div>
        {firstImagePath(entry) && <ImageIcon size={12} className="shrink-0" style={{ color: tConfig.fgHex + "45" }} />}
      </div>
    </button>
  );
}

function PlaceCard({
  group, open, t, tConfig, onToggle, onSelectEntry, onFilterLocation,
}: {
  group: PlaceGroup;
  open: boolean;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  onToggle: () => void;
  onSelectEntry: (entry: EntryRecord) => void;
  onFilterLocation?: (filter: LocationFilter) => void;
}) {
  const withoutCoords = group.entries.length - group.withCoords;
  return (
    <article className="overflow-hidden rounded-lg border" style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.uiHex }}>
      <button type="button" onClick={onToggle} className="relative block w-full text-left">
        <PlaceCover path={group.coverPath} tConfig={tConfig} />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 p-2 text-white">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/45 backdrop-blur">
            <MapPin size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{group.title}</h3>
            <p className="truncate text-[10px] text-white/75">{group.subtitle || group.filter.value}</p>
          </div>
          <span className="rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
            {group.entries.length}
          </span>
        </div>
      </button>
      <div className="px-2.5 py-2">
        <div className="mb-2 flex items-center gap-2">
          <button type="button" onClick={onToggle}
            className="inline-flex items-center gap-1 text-[11px] font-medium"
            style={{ color: tConfig.fgHex + "75" }}
            aria-expanded={open}>
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {open ? (t["journal.collapseTree"] || "Collapse") : (t["journal.expand"] || "Expand")}
          </button>
          {onFilterLocation && (
            <button type="button" onClick={() => onFilterLocation(group.filter)}
              className="ml-auto rounded px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>
              {t["journal.filter"] || "Filter"}
            </button>
          )}
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5 text-[10px]">
          <span className="rounded-full px-2 py-0.5" style={{ backgroundColor: tConfig.accentHex + "14", color: tConfig.accentHex }}>
            {group.withCoords} {t["journal.withCoordinates"] || "on map"}
          </span>
          {withoutCoords > 0 && (
            <span className="rounded-full px-2 py-0.5" style={{ backgroundColor: tConfig.fgHex + "0D", color: tConfig.fgHex + "65" }}>
              {withoutCoords} {t["journal.withoutCoordinates"] || "without coordinates"}
            </span>
          )}
        </div>
        {open && (
          <div className="space-y-1.5">
            {group.entries.map((entry) => <EntryRow key={entry.metadata.id} entry={entry} tConfig={tConfig} onSelectEntry={onSelectEntry} />)}
          </div>
        )}
      </div>
    </article>
  );
}

export function JournalMapView({ t, tConfig, entries, onSelectEntry, worldMapActive, onToggleWorldMap, onFilterLocation }: JournalMapViewProps) {
  const locatedEntries = useMemo(() => entries.filter((entry) => entry.metadata.location), [entries]);
  const places = useMemo(() => buildPlaces(locatedEntries), [locatedEntries]);
  const [openPlaces, setOpenPlaces] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOpenPlaces(new Set(places.slice(0, 2).map((place) => place.key)));
  }, [places.map((place) => place.key).join("|")]);

  const withCoords = useMemo(() => locatedEntries.filter(entryHasCoords).length, [locatedEntries]);
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

  const togglePlace = (key: string) => {
    setOpenPlaces((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b" style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.uiHex }}>
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: tConfig.fgHex + "75" }}>
              <Globe size={13} className="shrink-0" style={{ color: tConfig.accentHex }} />
              <span className="truncate">
                {places.length} {t["journal.places"] || "Places"} · {locatedEntries.length} {t["journal.entries"] || "entries"}
              </span>
            </div>
            <p className="mt-0.5 text-[10px]" style={{ color: tConfig.fgHex + "55" }}>
              {withCoords} {t["journal.withCoordinates"] || "on map"} · {withoutCoords} {t["journal.withoutCoordinates"] || "without coordinates"}
            </p>
          </div>
          {onToggleWorldMap && (
            <button type="button" onClick={onToggleWorldMap}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
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
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-2 py-2">
        {places.map((group) => (
          <PlaceCard key={group.key} group={group} open={openPlaces.has(group.key)}
            t={t} tConfig={tConfig} onToggle={() => togglePlace(group.key)}
            onSelectEntry={onSelectEntry} onFilterLocation={onFilterLocation} />
        ))}
      </div>
    </div>
  );
}
