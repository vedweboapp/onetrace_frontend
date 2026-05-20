import { City, Country, State } from "country-state-city";
import { normalizeWhat3WordsInput } from "@/shared/utils/what3words-display.util";
import type { Site } from "@/features/sites/types/site.types";
import type { SiteFormValues } from "@/features/sites/schemas/site-form-schema";
import type { SiteUpsertPayload } from "@/features/sites/types/site.types";

export function mapSiteFormToPayload(values: SiteFormValues, organizationId: number): SiteUpsertPayload {
  const country = Country.getCountryByCode(values.country_iso);
  const subdivisions = State.getStatesOfCountry(values.country_iso);
  const stateTrimmed = values.state_iso.trim();
  const clientId = Number.parseInt(values.client, 10);

  let statePayload = "";
  if (subdivisions.length > 0) {
    statePayload = subdivisions.find((s) => s.isoCode === stateTrimmed)?.name ?? stateTrimmed;
  }

  const cities =
    subdivisions.length > 0 && stateTrimmed ? City.getCitiesOfState(values.country_iso, stateTrimmed) : [];

  let cityPayload = "";
  if (cities.length > 0) {
    cityPayload = values.city.trim();
  }

  return {
    organization: organizationId,
    site_name: values.site_name.trim(),
    client: Number.isFinite(clientId) ? clientId : 0,
    address_line_1: values.address_line_1.trim(),
    address_line_2: values.address_line_2.trim(),
    city: cityPayload,
    state: statePayload,
    country: country?.name ?? values.country_iso,
    pincode: values.pincode.trim(),
    what3words: normalizeWhat3WordsInput(values.what3words),
    ...parseLatLngPayload(values.latitude, values.longitude),
  };
}

function parseLatLngPayload(
  latitude: string,
  longitude: string,
): { latitude?: number | null; longitude?: number | null } {
  const latRaw = latitude.trim();
  const lonRaw = longitude.trim();
  if (!latRaw && !lonRaw) return { latitude: null, longitude: null };
  const lat = latRaw ? Number.parseFloat(latRaw) : NaN;
  const lon = lonRaw ? Number.parseFloat(lonRaw) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { latitude: null, longitude: null };
  return { latitude: lat, longitude: lon };
}

export function emptySiteFormDefaults(): SiteFormValues {
  return {
    site_name: "",
    client: "",
    address_line_1: "",
    address_line_2: "",
    country_iso: "IN",
    state_iso: "",
    city: "",
    pincode: "",
    what3words: "",
    latitude: "",
    longitude: "",
  };
}

export function siteToFormDefaults(site: Site): SiteFormValues {
  const inferredIso =
    Country.getAllCountries().find((c) => c.name.toLowerCase() === (site.country ?? "").trim().toLowerCase())
      ?.isoCode ?? "";
  const countryIso = (inferredIso || "IN").toUpperCase();
  const states = State.getStatesOfCountry(countryIso);
  const stateIso = states.find((s) => s.name.toLowerCase() === (site.state ?? "").trim().toLowerCase())?.isoCode ?? "";

  const clientId =
    typeof site.client === "number"
      ? site.client
      : typeof site.client?.id === "number"
        ? site.client.id
        : 0;

  return {
    site_name: site.site_name ?? "",
    client: clientId > 0 ? String(clientId) : "",
    address_line_1: site.address_line_1?.trim() ?? "",
    address_line_2: site.address_line_2?.trim() ?? "",
    country_iso: countryIso,
    state_iso: stateIso,
    city: site.city?.trim() ?? "",
    pincode: site.pincode?.trim() ?? "",
    what3words: site.what3words?.trim() ?? "",
    latitude: site.latitude != null && Number.isFinite(site.latitude) ? String(site.latitude) : "",
    longitude: site.longitude != null && Number.isFinite(site.longitude) ? String(site.longitude) : "",
  };
}
