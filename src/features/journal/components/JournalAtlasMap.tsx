import { useEffect, useRef, useMemo } from "react";
import type { ThemeConfig } from "../../../types";
import type { EntryRecord } from "../domain/entry-service";

interface JournalAtlasMapProps {
  entries: EntryRecord[]; // only entries with manual coordinates
  tConfig: ThemeConfig;
  onSelectEntry: (entry: EntryRecord) => void;
  t?: Record<string, string>;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Return an entry's valid geographic coordinate, or null if absent/out-of-range. */
function entryCoord(e: EntryRecord): [number, number] | null {
  const lat = e.metadata.location?.latitude;
  const lng = e.metadata.location?.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if ((lat as number) < -90 || (lat as number) > 90 || (lng as number) < -180 || (lng as number) > 180) return null;
  return [lat as number, lng as number];
}

const MOOD_EMOJI: Record<string, string> = {
  great: "\u{1F60A}", good: "\u{1F642}", neutral: "\u{1F610}", sad: "\u{1F622}",
  angry: "\u{1F624}", anxious: "\u{1F630}", tired: "\u{1F634}", loved: "\u{1F970}",
  thankful: "\u{1F64F}", creative: "\u{2728}", sick: "\u{1F912}", excited: "\u{1F929}",
};

/**
 * Real interactive map (Leaflet + OpenStreetMap raster tiles), loaded lazily so
 * neither the library nor any network request happens until this view is opened.
 * Markers are entries with manual coordinates; clicking one opens the entry.
 */
export function JournalAtlasMap({ entries, tConfig, onSelectEntry, t }: JournalAtlasMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelectEntry);
  onSelectRef.current = onSelectEntry;

  // Signature that re-inits the map whenever anything a marker or popup renders
  // changes — coordinates, title, mood, place label, or the accent (theme) color.
  const pointsKey = useMemo(
    () => entries.map((e) => {
      const c = entryCoord(e);
      if (!c) return "";
      return `${e.metadata.id}:${c[0]},${c[1]}:${e.metadata.title ?? ""}:${e.metadata.mood ?? ""}:${e.metadata.location?.label ?? ""}`;
    }).filter(Boolean).join("|") + `#${tConfig.accentHex ?? ""}`,
    [entries, tConfig.accentHex],
  );

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const accent = tConfig.accentHex || "#3b82f6";
      const pinHtml = `<div style="width:16px;height:16px;border-radius:50% 50% 50% 0;background:${accent};transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45)"></div>`;
      const pinIcon = L.divIcon({ html: pinHtml, className: "", iconSize: [16, 16], iconAnchor: [8, 16], popupAnchor: [0, -16] });
      const moodIcon = (emoji: string) => L.divIcon({
        html: `<div style="width:28px;height:28px;border-radius:50%;background:#fff;border:2px solid ${accent};box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1">${emoji}</div>`,
        className: "", iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
      });

      const coords: [number, number][] = [];
      for (const e of entries) {
        const coord = entryCoord(e);
        if (!coord) continue;
        const [lat, lng] = coord;
        const title = escapeHtml(e.metadata.title || "Untitled");
        const label = escapeHtml(e.metadata.location?.label || "");
        const emoji = e.metadata.mood ? MOOD_EMOJI[e.metadata.mood] : undefined;
        const marker = L.marker([lat, lng], { icon: emoji ? moodIcon(emoji) : pinIcon }).addTo(map);
        marker.bindPopup(`<strong>${title}</strong>${label ? `<br><span style="opacity:.7">${label}</span>` : ""}`);
        marker.on("click", () => onSelectRef.current(e));
        coords.push([lat, lng]);
      }

      if (coords.length === 1) map.setView(coords[0], 11);
      else if (coords.length > 1) map.fitBounds(coords, { padding: [48, 48], maxZoom: 12 });
      else map.setView([20, 0], 2);

      // Tiles need a relayout once the container has its final size.
      setTimeout(() => map?.invalidateSize(), 100);
    })();

    return () => { cancelled = true; map?.remove(); };
  }, [pointsKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
