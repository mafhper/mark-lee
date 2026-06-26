import { useEffect, useRef, useState } from "react";
import type { ThemeConfig } from "../../../types";
import type { EntryRecord } from "../domain/entry-service";
import { MOOD_EMOJI, EMOJI_FONT_STACK } from "../domain/moods";

interface JournalAtlasMapProps {
  entries: EntryRecord[]; // only entries with manual coordinates are plotted
  selectedEntryId?: string | null;
  tConfig: ThemeConfig;
  onSelectEntry: (entry: EntryRecord) => void;
  t?: Record<string, string>;
}

/** Return an entry's valid geographic coordinate, or null if absent/out-of-range. */
function entryCoord(e: EntryRecord): [number, number] | null {
  const lat = e.metadata.location?.latitude;
  const lng = e.metadata.location?.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if ((lat as number) < -90 || (lat as number) > 90 || (lng as number) < -180 || (lng as number) > 180) return null;
  return [lat as number, lng as number];
}

interface CoordGroup {
  key: string;
  lat: number;
  lng: number;
  entries: EntryRecord[];
}

/**
 * Group entries that share (almost) the same coordinate. Without this, several
 * memories pinned to the same place stack exactly on top of each other and the
 * map looks like it only has one point — the symptom reported for v1.3.
 */
function groupByCoordinate(entries: EntryRecord[]): CoordGroup[] {
  const groups = new Map<string, CoordGroup>();
  for (const e of entries) {
    const coord = entryCoord(e);
    if (!coord) continue;
    const [lat, lng] = coord;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, lat, lng, entries: [] };
      groups.set(key, group);
    }
    group.entries.push(e);
  }
  return Array.from(groups.values());
}

function entryDateLabel(e: EntryRecord): string {
  const d = new Date(e.metadata.date);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Real interactive map (Leaflet + OpenStreetMap raster tiles), loaded lazily so
 * neither the library nor any network request happens until this view is opened.
 *
 * The map is created once and kept alive; markers live in a layer that is
 * rebuilt when the entries (or the accent color) change, so switching the app
 * theme no longer tears down and reloads the whole map. Entries sharing a
 * coordinate are merged into a counted group whose popup lists every memory.
 */
export function JournalAtlasMap({ entries, selectedEntryId, tConfig, onSelectEntry, t }: JournalAtlasMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelectEntry);
  onSelectRef.current = onSelectEntry;

  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const fittedKeyRef = useRef<string>("");
  const [ready, setReady] = useState(false);

  // Initialize the map exactly once. Tiles and the marker layer are created here
  // and reused; only markers are touched on later updates.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      map.setView([20, 0], 2);

      LRef.current = L;
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
      // Tiles need a relayout once the container has its final size.
      setTimeout(() => map.invalidateSize(), 100);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      LRef.current = null;
      fittedKeyRef.current = "";
      setReady(false);
    };
  }, []);

  // (Re)build markers when the entries or the accent color change. This never
  // recreates the map, so the viewport and tiles survive a theme switch.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;

    layer.clearLayers();
    const accent = tConfig.accentHex || "#3b82f6";
    const groups = groupByCoordinate(entries);

    const markerIcon = (group: CoordGroup, selected: boolean) => {
      const count = group.entries.length;
      const fill = selected ? "#111827" : accent;
      const stroke = selected ? accent : "#fff";
      const label = count > 1 ? String(count) : "";
      const mood = count === 1 && group.entries[0].metadata.mood ? MOOD_EMOJI[group.entries[0].metadata.mood!] : "";
      const size = selected ? 46 : count > 1 ? 42 : 38;
      return L.divIcon({
        className: "marklee-map-marker",
        html: `
          <div style="position:relative;width:${size}px;height:${size + 8}px;filter:drop-shadow(0 4px 7px rgba(0,0,0,.35));transform:${selected ? "scale(1.08)" : "scale(1)"};">
            <svg viewBox="0 0 40 48" width="${size}" height="${size + 8}" aria-hidden="true">
              <path d="M20 46s16-13.4 16-28A16 16 0 1 0 4 18c0 14.6 16 28 16 28Z" fill="${fill}" stroke="${stroke}" stroke-width="${selected ? 3 : 2}"/>
              <circle cx="20" cy="18" r="9.5" fill="#fff" opacity=".96"/>
            </svg>
            <span style="position:absolute;left:0;right:0;top:9px;text-align:center;color:${fill};font:${count > 1 ? "700 13px" : "600 15px"} system-ui,sans-serif;line-height:1;font-family:${mood ? EMOJI_FONT_STACK : "system-ui,sans-serif"}">${label || mood || "•"}</span>
          </div>
        `,
        iconSize: [size, size + 8],
        iconAnchor: [size / 2, size + 6],
        popupAnchor: [0, -(size + 2)],
      });
    };

    const openButton = (entry: EntryRecord) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = t?.["journal.openEntry"] || "Open entry";
      btn.style.cssText = `margin-top:6px;padding:3px 10px;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:600;color:#fff;background:${accent}`;
      btn.addEventListener("click", () => onSelectRef.current(entry));
      return btn;
    };

    const singlePopup = (entry: EntryRecord) => {
      const el = document.createElement("div");
      el.style.minWidth = "150px";
      const title = document.createElement("strong");
      title.textContent = entry.metadata.title || "Untitled";
      el.appendChild(title);
      const date = entryDateLabel(entry);
      const place = entry.metadata.location?.label || "";
      if (date || place) {
        const meta = document.createElement("div");
        meta.style.cssText = "opacity:.7;font-size:12px;margin-top:2px";
        meta.textContent = [date, place].filter(Boolean).join(" · ");
        el.appendChild(meta);
      }
      el.appendChild(openButton(entry));
      return el;
    };

    const multiPopup = (group: CoordGroup) => {
      const el = document.createElement("div");
      el.style.cssText = "min-width:170px;max-height:220px;overflow:auto";
      const heading = document.createElement("strong");
      heading.textContent = (t?.["journal.entriesAtPlace"] || "{n} entries at this place").replace("{n}", String(group.entries.length));
      el.appendChild(heading);
      const place = group.entries[0]?.metadata.location?.label;
      if (place) {
        const sub = document.createElement("div");
        sub.style.cssText = "opacity:.7;font-size:12px;margin:2px 0 6px";
        sub.textContent = place;
        el.appendChild(sub);
      }
      for (const entry of group.entries) {
        const row = document.createElement("button");
        row.type = "button";
        row.style.cssText = "display:block;width:100%;text-align:left;padding:4px 6px;border:none;background:transparent;cursor:pointer;font-size:12px;border-top:1px solid rgba(0,0,0,.08)";
        const moodEmoji = entry.metadata.mood ? MOOD_EMOJI[entry.metadata.mood] : "";
        row.textContent = `${moodEmoji ? moodEmoji + " " : ""}${entry.metadata.title || "Untitled"}${entryDateLabel(entry) ? " — " + entryDateLabel(entry) : ""}`;
        row.addEventListener("click", () => onSelectRef.current(entry));
        el.appendChild(row);
      }
      return el;
    };

    for (const group of groups) {
      const selected = group.entries.some((entry) => entry.metadata.id === selectedEntryId);
      const marker = L.marker([group.lat, group.lng], {
        icon: markerIcon(group, selected),
        title: group.entries.length > 1
          ? (t?.["journal.entriesAtPlace"] || "{n} entries at this place").replace("{n}", String(group.entries.length))
          : (group.entries[0].metadata.title || "Untitled"),
      }).addTo(layer);
      marker.on("click", () => {
        if (group.entries.length === 1) onSelectRef.current(group.entries[0]);
      });
      marker.bindPopup(group.entries.length > 1 ? multiPopup(group) : singlePopup(group.entries[0]));
    }

    // Only re-fit the viewport when the set of coordinates actually changes, so
    // a theme switch (accent-only update) keeps the user's current pan/zoom.
    const coordsKey = groups.map((g) => g.key).join("|");
    if (coordsKey !== fittedKeyRef.current) {
      fittedKeyRef.current = coordsKey;
      const coords = groups.map((g) => [g.lat, g.lng] as [number, number]);
      if (coords.length === 1) map.setView(coords[0], 11);
      else if (coords.length > 1) map.fitBounds(coords, { padding: [48, 48], maxZoom: 12 });
      else map.setView([20, 0], 2);
    }
  }, [ready, entries, selectedEntryId, tConfig.accentHex, t]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: 320 }}>
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: 320, backgroundColor: tConfig.uiHex }} />
      {/* Be transparent that map tiles are fetched online (not local-first). */}
      <div className="absolute top-2 left-2 z-[500] px-2 py-0.5 rounded-full text-[10px] pointer-events-none select-none"
        style={{ backgroundColor: tConfig.bgHex + "D8", color: tConfig.fgHex + "90", border: `1px solid ${tConfig.uiBorderHex}` }}>
        {t?.["journal.mapOnline"] || "Online map · OpenStreetMap"}
      </div>
    </div>
  );
}
