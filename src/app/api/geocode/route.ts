import { NextResponse } from "next/server";

const UA = "SimHo/1.0 (dashboard address preview)";

type LatLon = { lat: number; lon: number };

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseResults(data: unknown): LatLon | null {
  const rows = Array.isArray(data) ? data : [];
  const first = rows[0] as { lat?: string; lon?: string } | undefined;
  if (!first?.lat || !first?.lon) return null;
  const lat = Number.parseFloat(first.lat);
  const lon = Number.parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

async function nominatim(params: Record<string, string>): Promise<LatLon | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  for (const [k, v] of Object.entries(params)) {
    const t = v.trim();
    if (t) url.searchParams.set(k, t);
  }
  if (url.searchParams.toString().length < 8) return null;

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": UA,
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return parseResults(data);
}

/** Proxies OpenStreetMap Nominatim (User-Agent must be set server-side). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const street = searchParams.get("street")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";
  const state = searchParams.get("state")?.trim() ?? "";
  const postalcode = searchParams.get("postalcode")?.trim() ?? "";
  const country = searchParams.get("country")?.trim() ?? "";
  const legacyQ = searchParams.get("q")?.trim() ?? "";

  const hasStructured = !!(city || state || postalcode || country || street);
  if (!hasStructured && (legacyQ.length < 3 || legacyQ.length > 400)) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }
  if (hasStructured && !city && !state && !postalcode && !country && street.length < 5) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  try {
    let result: LatLon | null = null;

    // 1) Locality + postal + country (omit street — noisy addresses often fail here)
    if (city || state || postalcode || country) {
      result = await nominatim({ city, state, postalcode, country });
      if (result) {
        return NextResponse.json({ found: true as const, lat: result.lat, lon: result.lon });
      }
      await delay(260);
    }

    // 2) Structured with street (trim length)
    const streetUse = street.length > 180 ? street.slice(0, 180) : street;
    if (!result && streetUse && (city || state || postalcode || country)) {
      result = await nominatim({ street: streetUse, city, state, postalcode, country });
      if (result) {
        return NextResponse.json({ found: true as const, lat: result.lat, lon: result.lon });
      }
      await delay(260);
    }

    // 3) Postal + country only (good for PIN codes)
    if (!result && postalcode && country) {
      result = await nominatim({ postalcode, country });
      if (result) {
        return NextResponse.json({ found: true as const, lat: result.lat, lon: result.lon });
      }
      await delay(260);
    }

    // 4) Free-text fallback
    if (!result && legacyQ.length >= 3 && legacyQ.length <= 400) {
      result = await nominatim({ q: legacyQ });
    }

    if (!result) {
      return NextResponse.json({ found: false as const });
    }

    return NextResponse.json({ found: true as const, lat: result.lat, lon: result.lon });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
