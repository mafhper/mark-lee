// Parse coordinates out of whatever the user pastes into the location editor:
// a plain "lat, lng" (what Google Maps' "copy coordinates" produces), or a full
// Google Maps / OpenStreetMap URL. This is the local-first alternative to an
// online geocoder — combined with the click-to-place map picker, it lets people
// populate the map without sending anything to a third-party search service.

export interface LatLng {
  lat: number;
  lng: number;
}

const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";

function validate(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function parseCoordinateInput(raw: string): LatLng | null {
  if (!raw) return null;
  const text = raw.trim();

  // Google Maps place marker: "!3d<lat>!4d<lng>" (more precise than the @ center).
  const g3d = text.match(new RegExp(`!3d${NUM}!4d${NUM}`));
  if (g3d) return validate(Number(g3d[1]), Number(g3d[2]));

  // OSM marker query: "?mlat=<lat>&mlon=<lng>" (order-independent). A precise
  // marker, so it wins over the #map view center below.
  const mlat = text.match(new RegExp(`mlat=${NUM}`));
  const mlon = text.match(new RegExp(`mlon=${NUM}`));
  if (mlat && mlon) return validate(Number(mlat[1]), Number(mlon[1]));

  // Google Maps view center: "@<lat>,<lng>,<zoom>z".
  const at = text.match(new RegExp(`@${NUM},${NUM}`));
  if (at) return validate(Number(at[1]), Number(at[2]));

  // OpenStreetMap hash: "#map=<zoom>/<lat>/<lng>".
  const osm = text.match(new RegExp(`#map=\\d+(?:\\.\\d+)?\\/${NUM}\\/${NUM}`));
  if (osm) return validate(Number(osm[1]), Number(osm[2]));

  // Generic "?q=<lat>,<lng>".
  const q = text.match(new RegExp(`[?&]q=${NUM},${NUM}`));
  if (q) return validate(Number(q[1]), Number(q[2]));

  // Bare "lat, lng" / "lat; lng" (degree symbols stripped). Anchored so we don't
  // pick two unrelated numbers out of a longer string.
  const pair = text.replace(/°/g, " ").match(new RegExp(`^${NUM}\\s*[,;]\\s*${NUM}$`));
  if (pair) return validate(Number(pair[1]), Number(pair[2]));

  return null;
}
