import type { DetailAddressParts } from "@/shared/components/layout/detail-formatted-address";

/** Pull digits from messy pincode fields (e.g. typos); use for geocoder postalcode. */
export function extractPostalDigits(raw: string | null | undefined): string {
  if (raw == null) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length >= 4 && digits.length <= 12) return digits;
  return "";
}

/**
 * Whether we have enough locality to ask Nominatim (structured or fallback `q`).
 */
export function hasGeocodeableAddress(parts: DetailAddressParts | null | undefined): boolean {
  if (!parts) return false;
  const city = parts.city?.trim() ?? "";
  const state = parts.state?.trim() ?? "";
  const country = parts.country?.trim() ?? "";
  const line1 = parts.line1?.trim() ?? "";
  const line2 = parts.line2?.trim() ?? "";
  const pinDigits = extractPostalDigits(parts.pincode);
  if (pinDigits && (country || city || state)) return true;
  if (city && country) return true;
  if (city && state) return true;
  if (country && (line1 || line2)) return true;
  if ((line1 || line2) && (city || state)) return true;
  return false;
}

/**
 * Single-line fallback for Nominatim `q`: postcode / locality first, then street lines.
 */
export function buildAddressGeocodeQuery(parts: DetailAddressParts): string {
  const line1 = parts.line1?.trim() ?? "";
  const line2 = parts.line2?.trim() ?? "";
  const city = parts.city?.trim() ?? "";
  const state = parts.state?.trim() ?? "";
  const country = parts.country?.trim() ?? "";
  const pinDigits = extractPostalDigits(parts.pincode);
  const pinRaw = parts.pincode?.trim() ?? "";

  const bits: string[] = [];
  if (pinDigits) bits.push(pinDigits);
  else if (pinRaw && /\d/.test(pinRaw)) bits.push(pinRaw.slice(0, 24));

  const locality = [city, state].filter(Boolean).join(", ");
  if (locality) bits.push(locality);
  if (country) bits.push(country);
  if (line1) bits.push(line1);
  if (line2) bits.push(line2);
  return bits.filter(Boolean).join(", ");
}
