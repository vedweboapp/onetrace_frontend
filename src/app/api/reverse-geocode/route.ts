import { NextResponse } from "next/server";
import { parseNominatimPlace } from "@/shared/utils/nominatim-address-parse.util";

const UA = "SimHo/1.0 (dashboard reverse geocode)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number.parseFloat(searchParams.get("lat") ?? "");
  const lon = Number.parseFloat(searchParams.get("lon") ?? "");

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "invalid_coords" }, { status: 400 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": UA },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
    }

    const data = (await res.json()) as Parameters<typeof parseNominatimPlace>[0];
    const place = parseNominatimPlace(data);
    if (!place) {
      return NextResponse.json({ found: false as const });
    }

    return NextResponse.json({ found: true as const, place });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
