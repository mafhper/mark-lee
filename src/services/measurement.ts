export type MeasurementSystem = "metric" | "imperial";

export function formatDistance(meters: number, system: MeasurementSystem): string {
  if (system === "imperial") {
    const feet = meters * 3.28084;
    if (feet < 528) return `${Math.round(feet)} ft`;
    return `${(feet / 5280).toFixed(1)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatTemperature(celsius: number, system: MeasurementSystem): string {
  if (system === "imperial") {
    const f = celsius * 9 / 5 + 32;
    return `${Math.round(f)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

export function formatSpeed(kmh: number, system: MeasurementSystem): string {
  if (system === "imperial") {
    return `${(kmh * 0.621371).toFixed(1)} mph`;
  }
  return `${kmh.toFixed(1)} km/h`;
}

export function formatWeight(kg: number, system: MeasurementSystem): string {
  if (system === "imperial") {
    const lbs = kg * 2.20462;
    if (lbs < 2000) return `${lbs.toFixed(1)} lb`;
    return `${(lbs / 2000).toFixed(1)} t`;
  }
  if (kg < 1000) return `${kg.toFixed(1)} kg`;
  return `${(kg / 1000).toFixed(2)} t`;
}
