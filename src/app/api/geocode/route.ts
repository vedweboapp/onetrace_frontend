import { NextResponse } from "next/server";

const UA = "SimHo/1.0 (dashboard address preview)";
const NOMINATIM_GAP_MS = 300;

type LatLon = { lat: number; lon: number };

function parseFirst(data: unknown): LatLon | null {
  const rows = Array.isArray(data) ? data : [];
  const first = rows[0] as { lat?: string; lon?: string } | undefined;
  if (!first?.lat || !first?.lon) return null;
  const lat = Number.parseFloat(first.lat);
  const lon = Number.parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

/** Proxies OpenStreetMap Nominatim — tries several queries until one hits. */
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

  const cc = countryIso.length === 2 ? { countrycodes: countryIso } : {};
  const pin = postalcode || postalcodeAlt;

  if (q.length < 3 && qLocality.length < 3 && !city && !pin) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const queries: string[] = [];
  if (q.length >= 3) queries.push(q);
  if (qLocality.length >= 3 && qLocality !== q) queries.push(qLocality);
  if (street && city) {
    const sq = [street, city, state, pin, country].filter(Boolean).join(", ");
    if (sq.length >= 3 && !queries.includes(sq)) queries.push(sq);
  }
  if (pin && city) {
    const pq = [pin, city, state, country].filter(Boolean).join(", ");
    if (pq.length >= 3 && !queries.includes(pq)) queries.push(pq);
  }
  if (city && state && country) {
    const cq = [city, state, country].filter(Boolean).join(", ");
    if (cq.length >= 3 && !queries.includes(cq)) queries.push(cq);
  }
  if (city && country) {
    const cq = [city, country].filter(Boolean).join(", ");
    if (cq.length >= 3 && !queries.includes(cq)) queries.push(cq);
  }

  try {
    let nominatimAttempts = 0;

    for (const query of queries) {
      if (nominatimAttempts > 0) await sleep(NOMINATIM_GAP_MS);
      nominatimAttempts += 1;

      const hit = await nominatim({ q: query, ...cc });
      if (hit) {
        return NextResponse.json({ found: true as const, lat: hit.lat, lon: hit.lon, source: "nominatim" });
      }
    }

    if (street || city || state || pin || country) {
      if (nominatimAttempts > 0) await sleep(NOMINATIM_GAP_MS);
      const hit = await nominatim({
        ...cc,
        ...(street ? { street: street.slice(0, 200) } : {}),
        city,
        state,
        ...(pin ? { postalcode: pin } : {}),
        country,
      });
      if (hit) {
        return NextResponse.json({ found: true as const, lat: hit.lat, lon: hit.lon, source: "nominatim" });
      }
    }

    for (const query of queries) {
      const hit = await photonSearch(query);
      if (hit) {
        return NextResponse.json({ found: true as const, lat: hit.lat, lon: hit.lon, source: "photon" });
      }
    }

    return NextResponse.json({ found: false as const });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
