import { City, Country, State } from "country-state-city";
import type { Contact, ContactCreatePayload } from "@/features/contacts/types/contact.types";
import type { ContactFormValues } from "@/features/contacts/schemas/contact-form-schema";
import { getContactClientId, getContactType, getContactVendorId } from "@/features/contacts/utils/contact-nested-fields.util";

export function mapContactFormToPayload(values: ContactFormValues): ContactCreatePayload {
  const country = Country.getCountryByCode(values.country_iso);
  const subdivisions = State.getStatesOfCountry(values.country_iso);
  const stateTrimmed = values.state_iso.trim();

  let statePayload = "";
  if (subdivisions.length > 0) {
    statePayload = subdivisions.find((s) => s.isoCode === stateTrimmed)?.name ?? stateTrimmed;
  }

  const cities =
    subdivisions.length > 0 && stateTrimmed ? City.getCitiesOfState(values.country_iso, stateTrimmed) : [];
  let cityPayload = "";
  if (cities.length > 0) cityPayload = values.city.trim();

  const base = {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    contact_type: values.contact_type,
    address_line_1: values.address_line_1.trim(),
    address_line_2: values.address_line_2.trim(),
    city: cityPayload,
    state: statePayload,
    country: country?.name ?? values.country_iso,
    pincode: values.pincode.trim(),
  };

  if (values.contact_type === "vendor") {
    const vendorId = Number.parseInt(values.vendor, 10);
    return { ...base, vendor: Number.isFinite(vendorId) ? vendorId : 0 };
  }

  const clientId = Number.parseInt(values.client, 10);
  return { ...base, client: Number.isFinite(clientId) ? clientId : 0 };
}

export function emptyContactFormDefaults(
  overrides?: Partial<Pick<ContactFormValues, "contact_type" | "client" | "vendor">>,
): ContactFormValues {
  return {
    contact_type: overrides?.contact_type ?? "client",
    name: "",
    email: "",
    phone: "",
    client: overrides?.client ?? "",
    vendor: overrides?.vendor ?? "",
    address_line_1: "",
    address_line_2: "",
    country_iso: "",
    state_iso: "",
    city: "",
    pincode: "",
  };
}

export function contactToFormDefaults(contact: Contact): ContactFormValues {
  const allCountries = Country.getAllCountries();
  const matchedCountry = allCountries.find((c) => c.name.toLowerCase() === (contact.country ?? "").trim().toLowerCase());
  const countryIso = matchedCountry?.isoCode?.toUpperCase() ?? "";
  const states = State.getStatesOfCountry(countryIso);
  const matchedState = states.find((s) => s.name.toLowerCase() === (contact.state ?? "").trim().toLowerCase());
  const stateIso = matchedState?.isoCode ?? "";

  const contactType = getContactType(contact);
  const clientId = getContactClientId(contact);
  const vendorId = getContactVendorId(contact);

  return {
    contact_type: contactType,
    name: contact.name ?? "",
    email: contact.email ?? "",
    phone: (contact.phone ?? "").trim(),
    client: clientId != null && clientId > 0 ? String(clientId) : "",
    vendor: vendorId != null && vendorId > 0 ? String(vendorId) : "",
    address_line_1: (contact.address_line_1 ?? "").trim(),
    address_line_2: (contact.address_line_2 ?? "").trim(),
    country_iso: countryIso,
    state_iso: stateIso,
    city: (contact.city ?? "").trim(),
    pincode: (contact.pincode ?? "").trim(),
  };
}
