import { useEffect, useRef, useMemo } from "react";
import type { ThemeConfig } from "../../../types";
import type { EntryRecord } from "../domain/entry-service";

interface JournalAtlasMapProps {
  entries: EntryRecord[]; // only entries with numeric lat/lng
  tConfig: ThemeConfig;
  onSelectEntry: (entry: EntryRecord) => void;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
export function JournalAtlasMap({ entries, tConfig, onSelectEntry }: JournalAtlasMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelectEntry);
  onSelectRef.current = onSelectEntry;

  // Stable signature so the map only re-inits when the plotted points actually change.
  const pointsKey = useMemo(
    () => entries.map((e) => `${e.metadata.id}:${e.metadata.location?.latitude},${e.metadata.location?.longitude}`).join("|"),
    [entries],
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
        const lat = e.metadata.location?.latitude;
        const lng = e.metadata.location?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") continue;
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

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: 320, backgroundColor: tConfig.uiHex }} />;
}
