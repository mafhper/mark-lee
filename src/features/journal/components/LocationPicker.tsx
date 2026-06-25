import { useEffect, useRef } from "react";
import type { ThemeConfig } from "../../../types";

interface LocationPickerProps {
  tConfig: ThemeConfig;
  lat?: number;
  lng?: number;
  onPick: (lat: number, lng: number) => void;
  t?: Record<string, string>;
}

function hasCoord(lat?: number, lng?: number): lat is number {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

/**
 * A small click-to-place map for setting an entry's coordinate without typing
 * raw numbers — the local-first alternative to an online geocoder. Reuses the
 * same lazy Leaflet + OpenStreetMap tiles as the atlas view (no new service),
 * so the only network surface is the tiles already disclosed elsewhere.
 */
export function LocationPicker({ tConfig, lat, lng, onPick, t }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const iconRef = useRef<import("leaflet").DivIcon | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);

  // Initialize once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const accent = tConfig.accentHex || "#3b82f6";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;background:${accent};transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45)"></div>`,
        iconSize: [18, 18], iconAnchor: [9, 18],
      });
      iconRef.current = icon;

      const start: [number, number] = hasCoord(lat, lng) ? [lat as number, lng as number] : [20, 0];
      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true })
        .setView(start, hasCoord(lat, lng) ? 12 : 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      if (hasCoord(lat, lng)) {
        markerRef.current = L.marker([lat as number, lng as number], { icon }).addTo(map);
      }

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        const rlat = Math.round(e.latlng.lat * 1e6) / 1e6;
        const rlng = Math.round(e.latlng.lng * 1e6) / 1e6;
        if (markerRef.current) markerRef.current.setLatLng([rlat, rlng]);
        else markerRef.current = L.marker([rlat, rlng], { icon }).addTo(map);
        onPickRef.current(rlat, rlng);
      });

      LRef.current = L;
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 80);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      iconRef.current = null;
      LRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reflect coordinates set elsewhere (typed or pasted) onto the map. When the
  // marker is already at this point — i.e. the change came from a click here —
  // we skip re-centering so clicking doesn't yank the view around.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !hasCoord(lat, lng)) return;
    const ll: [number, number] = [lat as number, lng as number];
    const cur = markerRef.current?.getLatLng();
    const alreadyThere = !!cur && Math.abs(cur.lat - (lat as number)) < 1e-6 && Math.abs(cur.lng - (lng as number)) < 1e-6;
    if (markerRef.current) markerRef.current.setLatLng(ll);
    else if (iconRef.current) markerRef.current = L.marker(ll, { icon: iconRef.current }).addTo(map);
    if (!alreadyThere) map.setView(ll, Math.max(map.getZoom() ?? 0, 12));
  }, [lat, lng]);

  return (
    <div className="relative w-full rounded overflow-hidden border" style={{ height: 200, borderColor: tConfig.uiBorderHex }}>
      <div ref={containerRef} className="w-full h-full" style={{ backgroundColor: tConfig.uiHex }} />
      <div className="absolute bottom-1 left-1 z-[500] px-1.5 py-0.5 rounded text-[9px] pointer-events-none select-none"
        style={{ backgroundColor: tConfig.bgHex + "D8", color: tConfig.fgHex + "90", border: `1px solid ${tConfig.uiBorderHex}` }}>
        {t?.["journal.clickToPlace"] || "Click the map to set the location"}
      </div>
    </div>
  );
}
