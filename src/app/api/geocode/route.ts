import { NextResponse } from "next/server";

const UA = "SimHo/1.0 (dashboard address preview)";

type LatLon = { lat: number; lon: number };

const geocodeCache = new Map<string, { hit: LatLon; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function parseFirst(data: unknown): LatLon | null {
  const rows = Array.isArray(data) ? data : [];
  const first = rows[0] as { lat?: string; lon?: string } | undefined;
  if (!first?.lat || !first?.lon) return null;
  const lat = Number.parseFloat(first.lat);
  const lon = Number.parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function cacheKey(parts: Record<string, string>): string {
  return JSON.stringify(parts);
}

function readCache(key: string): LatLon | null {
  const row = geocodeCache.get(key);
  if (!row) return null;
  if (Date.now() > row.expires) {
    geocodeCache.delete(key);
    return null;
  }
  return row.hit;
}

function writeCache(key: string, hit: LatLon) {
  geocodeCache.set(key, { hit, expires: Date.now() + CACHE_TTL_MS });
}

async function nominatim(params: Record<string, string>): Promise<LatLon | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  for (const [k, v] of Object.entries(params)) {
    const t = v.trim();
    if (t) url.searchParams.set(k, t);
  }

  if (url.searchParams.toString().length < 8) return null;

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return parseFirst(await res.json());
}

async function photonSearch(query: string): Promise<LatLon | null> {
  const q = query.trim();
  if (q.length < 3) return null;

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    features?: { geometry?: { coordinates?: [number, number] } }[];
  };
  const coords = json.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const [lon, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

async function photonFirst(queries: string[]): Promise<LatLon | null> {
  const unique = [...new Set(queries.map((q) => q.trim()).filter((q) => q.length >= 3))].slice(0, 4);
  if (unique.length === 0) return null;

  const results = await Promise.all(unique.map((q) => photonSearch(q)));
  return results.find((hit) => hit != null) ?? null;
}

/** Proxies geocoding — Photon first (fast), then at most two Nominatim attempts. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const street = searchParams.get("street")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";
  const state = searchParams.get("state")?.trim() ?? "";
  const postalcode = searchParams.get("postalcode")?.trim() ?? "";
  const postalcodeAlt = searchParams.get("postalcode_alt")?.trim() ?? "";
  const country = searchParams.get("country")?.trim() ?? "";
  const countryIso = searchParams.get("country_iso")?.trim().toLowerCase() ?? "";
  const q = searchParams.get("q")?.trim() ?? "";
  const qLocality = searchParams.get("q_locality")?.trim() ?? "";

  const countryCodes: Record<string, string> = {};
  if (countryIso.length === 2) countryCodes.countrycodes = countryIso;
  const pin = postalcode || postalcodeAlt;

  if (q.length < 3 && qLocality.length < 3 && !city && !pin) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const ck = cacheKey({
    street,
    city,
    state,
    postalcode: pin,
    country,
    country_iso: countryIso,
    q,
    q_locality: qLocality,
  });
  const cached = readCache(ck);
  if (cached) {
    return NextResponse.json({ found: true as const, lat: cached.lat, lon: cached.lon, source: "cache" });
  }

  const photonQueries: string[] = [];
  if (qLocality.length >= 3) photonQueries.push(qLocality);
  if (pin && city) {
    const pq = [pin, city, state, country].filter(Boolean).join(", ");
    if (pq.length >= 3) photonQueries.push(pq);
  }
  if (q.length >= 3) photonQueries.push(q);
  if (city && state && country) {
    const cq = [city, state, country].filter(Boolean).join(", ");
    if (cq.length >= 3) photonQueries.push(cq);
  }

  try {
    const photonHit = await photonFirst(photonQueries);
    if (photonHit) {
      writeCache(ck, photonHit);
      return NextResponse.json({ found: true as const, lat: photonHit.lat, lon: photonHit.lon, source: "photon" });
    }

    const nominatimQueries: string[] = [];
    if (qLocality.length >= 3) nominatimQueries.push(qLocality);
    if (q.length >= 3 && q !== qLocality) nominatimQueries.push(q);

    for (const query of nominatimQueries.slice(0, 2)) {
      const hit = await nominatim({ q: query, ...countryCodes });
      if (hit) {
        writeCache(ck, hit);
        return NextResponse.json({ found: true as const, lat: hit.lat, lon: hit.lon, source: "nominatim" });
      }
    }

    if (street || city || state || pin || country) {
      const structured: Record<string, string> = { ...countryCodes, city, state, country };
      if (street) structured.street = street.slice(0, 200);
      if (pin) structured.postalcode = pin;
      const hit = await nominatim(structured);
      if (hit) {
        writeCache(ck, hit);
        return NextResponse.json({ found: true as const, lat: hit.lat, lon: hit.lon, source: "nominatim" });
      }
    }

    return NextResponse.json({ found: false as const });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
