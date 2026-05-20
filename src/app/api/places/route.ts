import { NextResponse } from "next/server";
import { parseNominatimPlace } from "@/shared/utils/nominatim-address-parse.util";

const UA = "SimHo/1.0 (dashboard place search)";

function buildSearchQuery(
  q: string,
  city: string,
  state: string,
  country: string,
  pincode: string,
): string {
  const parts = [q.trim()];
  const pin = pincode.replace(/\D/g, "").slice(0, 12);
  if (pin.length >= 4 && !q.includes(pin)) parts.push(pin);
  const locality = [city, state].filter(Boolean).join(", ");
  if (locality && !q.toLowerCase().includes(locality.toLowerCase())) {
    parts.push(locality);
  }
  if (country && !q.toLowerCase().includes(country.toLowerCase())) {
    parts.push(country);
  }
  return parts.filter(Boolean).join(", ").slice(0, 200);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const countryIso = searchParams.get("country")?.trim().toLowerCase() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";
  const state = searchParams.get("state")?.trim() ?? "";
  const countryName = searchParams.get("countryName")?.trim() ?? "";
  const pincode = searchParams.get("pincode")?.trim() ?? "";

  const searchQ = buildSearchQuery(q, city, state, countryName, pincode);

  if (searchQ.length < 2 || searchQ.length > 200) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  async function fetchPlaces(query: string) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("dedupe", "1");
    url.searchParams.set("limit", "12");
    url.searchParams.set("q", query);
    if (countryIso.length === 2) {
      url.searchParams.set("countrycodes", countryIso);
    }

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": UA },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = (await res.json()) as unknown;
    const rows = Array.isArray(data) ? data : [];
    const seen = new Set<string>();
    return rows
      .map((row) => parseNominatimPlace(row as Parameters<typeof parseNominatimPlace>[0]))
      .filter((p): p is NonNullable<typeof p> => {
        if (!p) return false;
        const key = p.label.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  try {
    const primary = await fetchPlaces(searchQ);
    if (primary === null) {
      return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
    }

    let results = primary;

    if (results.length === 0 && searchQ !== q.trim()) {
      const fallbackQ = [q.trim(), countryName].filter(Boolean).join(", ").slice(0, 200);
      if (fallbackQ.length >= 2) {
        const fallback = await fetchPlaces(fallbackQ);
        if (fallback?.length) results = fallback;
      }
    }

    if (results.length === 0) {
      const broadQ = q.trim().slice(0, 200);
      if (broadQ.length >= 2 && broadQ !== searchQ) {
        const broad = await fetchPlaces(broadQ);
        if (broad?.length) results = broad;
      }
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
