import type { Contact, ContactCreatePayload } from "@/features/contacts/types/contact.types";
import type { ContactFormValues } from "@/features/contacts/schemas/contact-form-schema";
import {
  getContactClientId,
  getContactType,
  getContactVendorId,
} from "@/features/contacts/utils/contact-nested-fields.util";
import { splitLegacyContactName } from "@/features/contacts/utils/contact-name.util";
import {
  emptyEntityAddressFormRow,
  mapEntityAddressApiToFormRow,
  mapEntityAddressFormRowToPayload,
  normalizePrimaryEntityAddresses,
} from "@/shared/form/entity-address-form.util";
import type { EntityAddress } from "@/shared/types/entity-address.types";
import { normalizePhoneForPhoneInput } from "@/shared/utils/phone-input.util";

/** Prefer API `addresses[]`; fall back to legacy flat address. */
export function resolveContactAddresses(contact: Contact): EntityAddress[] {
  if (Array.isArray(contact.addresses) && contact.addresses.length > 0) {
    return contact.addresses;
  }

  const line1 = contact.address_line_1?.trim() ?? "";
  const line2 = contact.address_line_2?.trim() ?? "";

  if (!line1 && !contact.city && !contact.country && !contact.pincode) {
    return [];
  }

  return [
    {
      address_type: "billing",
      address_line_1: line1,
      address_line_2: line2 || null,
      city: contact.city?.trim() ?? "",
      state: contact.state?.trim() ?? "",
      country: contact.country?.trim() ?? "",
      pincode: contact.pincode?.trim() ?? "",
      is_primary: true,
    },
  ];
}

export function mapContactFormToPayload(values: ContactFormValues): ContactCreatePayload {
  const addresses = normalizePrimaryEntityAddresses(values.addresses).map((row) => {
    const payload = mapEntityAddressFormRowToPayload(row);
    const { latitude: _lat, longitude: _lon, ...rest } = payload;
    return rest;
  });

  const base = {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    contact_type: values.contact_type,
    addresses,
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
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    client: overrides?.client ?? "",
    vendor: overrides?.vendor ?? "",
    addresses: [emptyEntityAddressFormRow({ address_type: "billing", is_primary: true })],
  };
}

export function contactToFormDefaults(contact: Contact): ContactFormValues {
  const addresses = resolveContactAddresses(contact);
  const contactType = getContactType(contact);
  const clientId = getContactClientId(contact);
  const vendorId = getContactVendorId(contact);

  const first = contact.first_name?.trim() ?? "";
  const last = contact.last_name?.trim() ?? "";
  const fromLegacy =
    !first && !last ? splitLegacyContactName(contact.name) : { first_name: first, last_name: last };

  return {
    contact_type: contactType,
    first_name: fromLegacy.first_name,
    last_name: fromLegacy.last_name,
    email: contact.email ?? "",
    phone: normalizePhoneForPhoneInput(contact.phone),
    client: clientId != null && clientId > 0 ? String(clientId) : "",
    vendor: vendorId != null && vendorId > 0 ? String(vendorId) : "",
    addresses:
      addresses.length > 0
        ? addresses.map((addr) => mapEntityAddressApiToFormRow(addr))
        : [emptyEntityAddressFormRow({ address_type: "billing", is_primary: true })],
  };
}
