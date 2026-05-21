import { Country } from "country-state-city";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { resolveCityInDataset, resolveStateIso } from "@/shared/utils/nominatim-address-parse.util";

function pickComponent(
  components: google.maps.GeocoderAddressComponent[],
  type: string,
  nameType: "long_name" | "short_name" = "long_name",
): string {
  const row = components.find((c) => c.types.includes(type));
  return row?.[nameType]?.trim() ?? "";
}

function pickCity(components: google.maps.GeocoderAddressComponent[]): string {
  return (
    pickComponent(components, "locality") ||
    pickComponent(components, "postal_town") ||
    pickComponent(components, "administrative_area_level_2") ||
    pickComponent(components, "administrative_area_level_3") ||
    pickComponent(components, "sublocality") ||
    pickComponent(components, "sublocality_level_1") ||
    ""
  );
}

function pickLine1(
  components: google.maps.GeocoderAddressComponent[],
  formattedAddress?: string,
  name?: string,
): string {
  const streetNumber = pickComponent(components, "street_number");
  const route = pickComponent(components, "route");
  const built = [streetNumber, route].filter(Boolean).join(" ").trim();
  if (built) return built;
  const placeName = name?.trim() ?? "";
  if (placeName && route) return `${placeName}, ${route}`.trim();
  if (route) return route;
  const premise = pickComponent(components, "premise") || pickComponent(components, "establishment");
  if (premise) return premise;
  if (placeName) return placeName;
  return formattedAddress?.split(",")[0]?.trim() ?? "";
}

function pickLine2(components: google.maps.GeocoderAddressComponent[]): string {
  const parts = [
    pickComponent(components, "sublocality_level_2"),
    pickComponent(components, "sublocality_level_1"),
    pickComponent(components, "sublocality"),
    pickComponent(components, "neighborhood"),
    pickComponent(components, "subpremise"),
    pickComponent(components, "premise"),
  ].filter(Boolean);
  const unique = [...new Set(parts)];
  return unique.join(", ").trim();
}

function readLatLng(
  geometry: google.maps.GeocoderGeometry | google.maps.places.PlaceGeometry | undefined,
): { lat: number; lng: number } | null {
  const loc = geometry?.location;
  if (!loc) return null;
  const lat = loc.lat();
  const lng = loc.lng();
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function parseGoogleAddressComponents(
  components: google.maps.GeocoderAddressComponent[],
  geometry: google.maps.GeocoderGeometry | google.maps.places.PlaceGeometry | undefined,
  formattedAddress?: string,
  name?: string,
): PlaceSuggestion | null {
  const coords = readLatLng(geometry);
  if (!coords) return null;
  const { lat, lng: lon } = coords;

  const countryIso = pickComponent(components, "country", "short_name").toUpperCase();
  const countryRecord = countryIso ? Country.getCountryByCode(countryIso) : undefined;
  const country = pickComponent(components, "country") || countryRecord?.name || "";
  const stateName =
    pickComponent(components, "administrative_area_level_1") ||
    pickComponent(components, "administrative_area_level_2");
  const stateIso = resolveStateIso(countryIso, stateName);
  const cityRaw = pickCity(components);
  const city = resolveCityInDataset(countryIso, stateIso, cityRaw);
  const line1 = pickLine1(components, formattedAddress, name);
  const line2 = pickLine2(components);
  const pincode = pickComponent(components, "postal_code");
  const label =
    formattedAddress?.trim() || [line1, city, stateName, country].filter(Boolean).join(", ");

  return {
    id: `google:${lat},${lon}`,
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

export function parseGooglePlaceResult(
  place: google.maps.places.PlaceResult,
  opts?: { preferredLine1?: string },
): PlaceSuggestion | null {
  if (!place.address_components?.length) return null;
  const parsed = parseGoogleAddressComponents(
    place.address_components,
    place.geometry,
    place.formatted_address,
    place.name,
  );
  if (!parsed) return null;
  if (opts?.preferredLine1?.trim()) {
    parsed.line1 = opts.preferredLine1.trim();
  }
  return parsed;
}

export function parseGoogleGeocoderResult(result: google.maps.GeocoderResult): PlaceSuggestion | null {
  if (!result.address_components?.length) return null;
  return parseGoogleAddressComponents(
    result.address_components,
    result.geometry,
    result.formatted_address,
  );
}
