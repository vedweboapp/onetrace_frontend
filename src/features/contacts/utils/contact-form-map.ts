import { City, Country, State } from "country-state-city";
import type { Contact } from "@/features/contacts/types/contact.types";
import type { ContactCreatePayload } from "@/features/contacts/types/contact.types";
import type { ContactFormValues } from "@/features/contacts/schemas/contact-form-schema";

export function mapContactFormToPayload(values: ContactFormValues, organizationId: number): ContactCreatePayload {
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
  if (cities.length > 0) cityPayload = values.city.trim();

  return {
    organization: organizationId,
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    client: Number.isFinite(clientId) ? clientId : 0,
    address_line_1: values.address_line_1.trim(),
    address_line_2: values.address_line_2.trim(),
    city: cityPayload,
    state: statePayload,
    country: country?.name ?? values.country_iso,
    pincode: values.pincode.trim(),
  };
}

export function emptyContactFormDefaults(): ContactFormValues {
  return {
    name: "",
    email: "",
    phone: "",
    client: "",
    address_line_1: "",
    address_line_2: "",
    country_iso: "IN",
    state_iso: "",
    city: "",
    pincode: "",
  };
}

export function contactToFormDefaults(contact: Contact): ContactFormValues {
  const allCountries = Country.getAllCountries();
  const matchedCountry = allCountries.find((c) => c.name.toLowerCase() === (contact.country ?? "").trim().toLowerCase());
  const countryIso = matchedCountry?.isoCode ?? "IN";
  const states = State.getStatesOfCountry(countryIso);
  const matchedState = states.find((s) => s.name.toLowerCase() === (contact.state ?? "").trim().toLowerCase());
  const stateIso = matchedState?.isoCode ?? "";

  const clientId =
    typeof contact.client === "number"
      ? contact.client
      : typeof contact.client?.id === "number"
        ? contact.client.id
        : 0;

  return {
    name: contact.name ?? "",
    email: contact.email ?? "",
    phone: (contact.phone ?? "").trim(),
    client: clientId > 0 ? String(clientId) : "",
    address_line_1: (contact.address_line_1 ?? "").trim(),
    address_line_2: (contact.address_line_2 ?? "").trim(),
    country_iso: countryIso,
    state_iso: stateIso,
    city: (contact.city ?? "").trim(),
    pincode: (contact.pincode ?? "").trim(),
  };
}
