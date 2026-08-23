// Live weather for the weather segment, from Open-Meteo (free, no API key). Called server-side
// from the portal at request time. If the fetch fails we return null and the UI says so plainly,
// rather than ever putting stale or invented numbers on air.

const WMO: Record<number, string> = {
  0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Light showers", 81: "Showers", 82: "Violent showers",
  85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Severe thunderstorm",
};

export interface WeatherDay { date: string; hi: number; lo: number; code: number; label: string; precip: number }
export interface WeatherNow {
  location: string;
  currentTemp: number;
  currentLabel: string;
  fetchedAt: string;
  days: WeatherDay[];
}

export async function fetchWeather(lat: number, lng: number, location: string, fahrenheit = true): Promise<WeatherNow | null> {
  const unit = fahrenheit ? "fahrenheit" : "celsius";
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&temperature_unit=${unit}&timezone=auto&forecast_days=5`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const d = await res.json();
    const days: WeatherDay[] = (d.daily?.time || []).map((date: string, i: number) => ({
      date,
      hi: Math.round(d.daily.temperature_2m_max[i]),
      lo: Math.round(d.daily.temperature_2m_min[i]),
      code: d.daily.weather_code[i],
      label: WMO[d.daily.weather_code[i]] || "—",
      precip: d.daily.precipitation_probability_max?.[i] ?? 0,
    }));
    return {
      location,
      currentTemp: Math.round(d.current?.temperature_2m ?? 0),
      currentLabel: WMO[d.current?.weather_code] || "—",
      fetchedAt: new Date().toISOString(),
      days,
    };
  } catch {
    return null;
  }
}
