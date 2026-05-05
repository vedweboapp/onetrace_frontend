import { City, Country, State } from "country-state-city";
import type { Client } from "@/features/clients/types/client.types";
import type { ClientFormValues } from "@/features/clients/schemas/client-form-schema";
import type { ClientUpsertPayload } from "@/features/clients/types/client.types";

export function mapClientFormToPayload(values: ClientFormValues, organizationId: number): ClientUpsertPayload {
  const country = Country.getCountryByCode(values.country_iso);
  const subdivisions = State.getStatesOfCountry(values.country_iso);
  const stateTrimmed = values.state_iso.trim();

  let statePayload = "";
  if (subdivisions.length > 0) {
    statePayload =
      subdivisions.find((s) => s.isoCode === stateTrimmed)?.name ?? stateTrimmed;
  }

  const cities =
    subdivisions.length > 0 && stateTrimmed ? City.getCitiesOfState(values.country_iso, stateTrimmed) : [];

  let cityPayload = "";
  if (cities.length > 0) {
    cityPayload = values.city.trim();
  }

  const line2 = values.address_line_2.trim();

  return {
    organization: organizationId,
    name: values.name.trim(),
    contact_person: values.contact_person.trim(),
    email: values.email.trim(),
    phone: values.phone,
    address_line_1: values.address_line_1.trim(),
    address_line_2: line2,
    city: cityPayload,
    state: statePayload,
    country: country?.name ?? values.country_iso,
    pincode: values.pincode.trim(),
  };
}

export function emptyClientFormDefaults(): ClientFormValues {
  return {
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address_line_1: "",
    address_line_2: "",
    country_iso: "IN",
    state_iso: "",
    city: "",
    pincode: "",
  };
}

export function clientToFormDefaults(client: Client): ClientFormValues {
  const inferredIso =
    Country.getAllCountries().find(
      (c) => c.name.toLowerCase() === (client.country ?? "").trim().toLowerCase(),
    )?.isoCode ?? "";

  const countryIso = (inferredIso || "IN").toUpperCase();

  const states = State.getStatesOfCountry(countryIso);
  const stateIso =
    states.find((s) => s.name.toLowerCase() === (client.state ?? "").trim().toLowerCase())?.isoCode ?? "";

  let line1 = client.address_line_1?.trim() ?? "";
  let line2 = client.address_line_2?.trim() ?? "";

  const legacyAddress = typeof client.address === "string" ? client.address.trim() : "";
  if (!line1 && legacyAddress) {
    const parts = legacyAddress.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    line1 = parts[0] ?? "";
    line2 = parts.slice(1).join("\n");
  }

  return {
    name: client.name ?? "",
    contact_person: client.contact_person ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    address_line_1: line1,
    address_line_2: line2,
    country_iso: countryIso,
    state_iso: stateIso,
    city: client.city?.trim() ?? "",
    pincode: client.pincode?.trim() ?? "",
  };
}
