import { City, Country, State } from "country-state-city";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";

type NominatimAddress = Record<string, string | undefined>;

function pickCity(addr: NominatimAddress): string {
  return (
    addr.city?.trim() ||
    addr.town?.trim() ||
    addr.village?.trim() ||
    addr.municipality?.trim() ||
    addr.hamlet?.trim() ||
    addr.suburb?.trim() ||
    ""
  );
}

function pickLine1(addr: NominatimAddress): string {
  const parts = [addr.house_number, addr.road ?? addr.pedestrian ?? addr.footway ?? addr.path].filter(Boolean);
  if (parts.length) return parts.join(" ").trim();
  return (
    addr.building?.trim() ||
    addr.amenity?.trim() ||
    addr.shop?.trim() ||
    addr.office?.trim() ||
    ""
  );
}

function pickLine2(addr: NominatimAddress): string {
  const parts = [addr.suburb, addr.neighbourhood, addr.quarter, addr.industrial].filter((p) => p?.trim());
  const line1Bits = new Set([addr.house_number, addr.road].filter(Boolean));
  const filtered = parts.filter((p) => p && !line1Bits.has(p));
  return filtered.join(", ").trim();
}

export function resolveStateIso(countryIso: string, stateName: string): string {
  const name = stateName.trim();
  if (!countryIso || !name) return "";
  const states = State.getStatesOfCountry(countryIso);
  const exact = states.find((s) => s.name.toLowerCase() === name.toLowerCase());
  if (exact) return exact.isoCode;
  const partial = states.find(
    (s) => name.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(name.toLowerCase()),
  );
  return partial?.isoCode ?? "";
}

export function resolveCityInDataset(countryIso: string, stateIso: string, cityName: string): string {
  const city = cityName.trim();
  if (!countryIso || !stateIso || !city) return city;
  const cities = City.getCitiesOfState(countryIso, stateIso);
  if (!cities.length) return city;
  const exact = cities.find((c) => c.name.toLowerCase() === city.toLowerCase());
  return exact?.name ?? city;
}

export function parseNominatimPlace(row: {
  place_id?: number | string;
  display_name?: string;
  lat?: string | number;
  lon?: string | number;
  address?: NominatimAddress;
}): PlaceSuggestion | null {
  const lat = Number.parseFloat(String(row.lat ?? ""));
  const lon = Number.parseFloat(String(row.lon ?? ""));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const addr = row.address ?? {};
  const countryIso = (addr.country_code ?? "").trim().toUpperCase();
  const countryRecord = countryIso ? Country.getCountryByCode(countryIso) : undefined;
  const country = addr.country?.trim() || countryRecord?.name || "";
  const stateName = addr.state?.trim() || addr.region?.trim() || "";
  const stateIso = resolveStateIso(countryIso, stateName);
  const cityRaw = pickCity(addr);
  const city = resolveCityInDataset(countryIso, stateIso, cityRaw);

  const line1 = pickLine1(addr);
  const line2 = pickLine2(addr);
  const pincode = addr.postcode?.trim() ?? "";

  const label = row.display_name?.trim() || [line1, city, stateName, country].filter(Boolean).join(", ");

  return {
    id: String(row.place_id ?? `${lat},${lon}`),
    label,
    line1: line1 || label.split(",")[0]?.trim() || label,
    line2,
    city,
    state: stateName,
    stateIso,
    country,
    countryIso: countryIso || countryRecord?.isoCode || "",
    pincode,
    lat,
    lon,
  };
}
