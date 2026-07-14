import type { WeatherResult } from "@/lib/mcp/types";

const WMO_CONDITIONS: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Icy fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
};

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
  };
};

export async function getWeather(lat: number, lon: number): Promise<WeatherResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("lat and lon must be finite numbers");
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,weather_code",
  );
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString(), {
    next: { revalidate: 600 },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed (${response.status})`);
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const current = data.current;

  if (
    current?.temperature_2m == null ||
    current.relative_humidity_2m == null ||
    current.weather_code == null
  ) {
    throw new Error("Open-Meteo response missing current weather fields");
  }

  return {
    tempC: Math.round(current.temperature_2m),
    humidity: Math.round(current.relative_humidity_2m),
    condition:
      WMO_CONDITIONS[current.weather_code] ?? `Code ${current.weather_code}`,
  };
}
