const COORDS_KEY = "scent_last_coords";

export type LatLon = { lat: number; lon: number };

export const DEFAULT_COORDS: LatLon = { lat: 40.7128, lon: -74.006 };

export function readCachedCoords(): LatLon | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(COORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LatLon>;
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lon === "number" &&
      Number.isFinite(parsed.lat) &&
      Number.isFinite(parsed.lon)
    ) {
      return { lat: parsed.lat, lon: parsed.lon };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeCachedCoords(coords: LatLon): void {
  try {
    sessionStorage.setItem(COORDS_KEY, JSON.stringify(coords));
  } catch {
    /* ignore */
  }
}

/**
 * Prefer cached coords immediately; refresh GPS in the background.
 * Never blocks the recommend UI on a slow permission prompt.
 */
export function resolveCoordsQuickly(): LatLon {
  const cached = readCachedCoords();
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        writeCachedCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => {
        /* keep cache / default */
      },
      { timeout: 2500, maximumAge: 600_000, enableHighAccuracy: false },
    );
  }
  return cached ?? DEFAULT_COORDS;
}
