import { City, Country, State } from "country-state-city";
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
  };
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
  };
}
