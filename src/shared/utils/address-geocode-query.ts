import { Country } from "country-state-city";
import type { DetailAddressParts } from "@/shared/components/layout/detail-formatted-address";

/** Pull digits from messy pincode fields (e.g. typos); use for geocoder postalcode. */
export function extractPostalDigits(raw: string | null | undefined): string {
  if (raw == null) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length >= 4 && digits.length <= 12) return digits;
  return "";
}

export function extractPincodeFromAddressText(text: string | null | undefined): string {
  const s = text?.trim() ?? "";
  if (!s) return "";
  const six = s.match(/\b(\d{6})\b/);
  if (six) return six[1];
  return extractPostalDigits(s);
}

export function collectPostcodesForGeocode(parts: DetailAddressParts): string[] {
  const combined = [parts.line1, parts.line2].filter(Boolean).join(" ");
  const fromField = extractPostalDigits(parts.pincode);
  const fromText = extractPincodeFromAddressText(combined);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of [fromField, fromText]) {
    if (p && !seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

/** Street line from address line 1 + line 2 (sector/plot often in line 2). */
export function buildGeocodeStreetLine(parts: DetailAddressParts): string {
  const combined = [parts.line1, parts.line2]
    .map((s) => s?.trim() ?? "")
    .filter(Boolean)
    .join(", ");
  if (!combined) return "";

  const segments: string[] = [];
  const seen = new Set<string>();

  const add = (s: string) => {
    const t = s.trim();
    if (!t || seen.has(t.toLowerCase())) return;
    seen.add(t.toLowerCase());
    segments.push(t);
  };

  const plotM = combined.match(/plot\s*(?:number|no\.?|#|-)?\s*[-:]?\s*(\d+[a-z]?)/i);
  if (plotM) add(`Plot ${plotM[1]}`);

  const sectorM = combined.match(/sector\s*[-:]?\s*(\d+[a-z]?)/i);
  if (sectorM) add(`Sector ${sectorM[1]}`);

  const partsList = combined.split(/[,，;]/).map((p) => p.trim()).filter(Boolean);
  const keywords =
    /sector|plot|floor|road|street|park|phase|block|iti|industrial|gram|nagar|colony|lane|marg|chowk|technology|tech/i;
  for (const p of partsList) {
    if (keywords.test(p) && p.length <= 80) add(p);
  }

  if (segments.length === 0) {
    return partsList.slice(0, 3).join(", ").slice(0, 200);
  }

  return segments.join(", ").slice(0, 200);
}

export function resolveCountryIso(parts: DetailAddressParts): string {
  const iso = parts.countryIso?.trim().toUpperCase();
  if (iso && /^[A-Z]{2}$/.test(iso)) return iso;
  const name = parts.country?.trim() ?? "";
  if (!name) return "";
  const byName = Country.getAllCountries().find(
    (c) => c.name.toLowerCase() === name.toLowerCase() || c.isoCode.toLowerCase() === name.toLowerCase(),
  );
  return byName?.isoCode ?? "";
}

export function hasGeocodeableAddress(parts: DetailAddressParts | null | undefined): boolean {
  if (!parts) return false;
  const city = parts.city?.trim() ?? "";
  const state = parts.state?.trim() ?? "";
  const country = parts.country?.trim() ?? "";
  const countryIso = resolveCountryIso(parts);
  const line1 = parts.line1?.trim() ?? "";
  const line2 = parts.line2?.trim() ?? "";
  const street = buildGeocodeStreetLine(parts);
  const pinDigits = collectPostcodesForGeocode(parts)[0] ?? "";
  if (pinDigits && (country || countryIso || city || state)) return true;
  if (city && (country || countryIso)) return true;
  if (city && state) return true;
  if ((country || countryIso) && (line1 || line2 || street)) return true;
  if ((line1 || line2 || street) && (city || state)) return true;
  return false;
}

/** City + state + pin + country (anchor when street search fails). */
export function buildLocalityGeocodeQuery(parts: DetailAddressParts): string {
  const city = parts.city?.trim() ?? "";
  const state = parts.state?.trim() ?? "";
  const country = parts.country?.trim() ?? "";
  const pin = collectPostcodesForGeocode(parts)[0] ?? "";
  return [pin, city, state, country].filter(Boolean).join(", ");
}

export function buildAddressGeocodeQuery(parts: DetailAddressParts): string {
  const city = parts.city?.trim() ?? "";
  const state = parts.state?.trim() ?? "";
  const country = parts.country?.trim() ?? "";
  const pins = collectPostcodesForGeocode(parts);
  const street = buildGeocodeStreetLine(parts);

  return [street, city, state, pins[0], country].filter(Boolean).join(", ");
}

export function buildGeocodeRequestSearchParams(parts: DetailAddressParts): URLSearchParams {
  const sp = new URLSearchParams();
  const city = parts.city?.trim() ?? "";
  const state = parts.state?.trim() ?? "";
  const country = parts.country?.trim() ?? "";
  const pins = collectPostcodesForGeocode(parts);
  const street = buildGeocodeStreetLine(parts);

  if (street) sp.set("street", street);
  if (city) sp.set("city", city);
  if (state) sp.set("state", state);
  if (pins[0]) sp.set("postalcode", pins[0]);
  if (pins[1]) sp.set("postalcode_alt", pins[1]);
  if (country) sp.set("country", country);

  const iso = resolveCountryIso(parts);
  if (iso) sp.set("country_iso", iso.toLowerCase());

  const q = buildAddressGeocodeQuery(parts);
  if (q) sp.set("q", q);

  const qLocality = buildLocalityGeocodeQuery(parts);
  if (qLocality) sp.set("q_locality", qLocality);

  return sp;
}
