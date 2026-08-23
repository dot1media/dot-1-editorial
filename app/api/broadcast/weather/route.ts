import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/session";
import { fetchWeather } from "@/lib/weather";

export const runtime = "nodejs";

// Live forecast for the weather segment. Reads lat/lng from query; returns real data or a clear
// "unavailable" so the anchor never reads stale numbers.
export async function GET(request: Request) {
  const gate = await requireCapability("broadcast.view");
  if ("response" in gate) return gate.response;

  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const location = url.searchParams.get("location") || "";
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Set a weather location with coordinates first." }, { status: 400 });
  }

  const weather = await fetchWeather(lat, lng, location, true);
  if (!weather) return NextResponse.json({ error: "Forecast is unavailable right now." }, { status: 502 });
  return NextResponse.json({ weather });
}
