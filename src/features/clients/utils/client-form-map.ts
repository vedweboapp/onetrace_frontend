import type { Client, ClientUpsertPayload } from "@/features/clients/types/client.types";
import type { ClientFormValues } from "@/features/clients/schemas/client-form-schema";
import {
  emptyEntityAddressFormRow,
  mapEntityAddressApiToFormRow,
  mapEntityAddressFormRowToPayload,
  normalizePrimaryEntityAddresses,
} from "@/shared/form/entity-address-form.util";
import type { EntityAddress } from "@/shared/types/entity-address.types";
import { normalizePhoneForPhoneInput } from "@/shared/utils/phone-input.util";

/** Prefer API `addresses[]`; fall back to legacy flat / single-line address. */
export function resolveClientAddresses(client: Client): EntityAddress[] {
  if (Array.isArray(client.addresses) && client.addresses.length > 0) {
    return client.addresses;
  }

  const line1 = client.address_line_1?.trim() ?? "";
  const line2 = client.address_line_2?.trim() ?? "";
  const legacy = typeof client.address === "string" ? client.address.trim() : "";
  let resolvedLine1 = line1;
  let resolvedLine2 = line2;
  if (!resolvedLine1 && legacy) {
    const parts = legacy.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    resolvedLine1 = parts[0] ?? "";
    resolvedLine2 = parts.slice(1).join("\n");
  }

  if (!resolvedLine1 && !client.city && !client.country && !client.pincode) {
    return [];
  }

  return [
    {
      address_type: "billing",
      address_line_1: resolvedLine1,
      address_line_2: resolvedLine2 || null,
      city: client.city?.trim() ?? "",
      state: client.state?.trim() ?? "",
      country: client.country?.trim() ?? "",
      pincode: client.pincode?.trim() ?? "",
      is_primary: true,
    },
  ];
}

export function mapClientFormToPayload(values: ClientFormValues): ClientUpsertPayload {
  const addresses = normalizePrimaryEntityAddresses(values.addresses).map((row) => {
    const payload = mapEntityAddressFormRowToPayload(row);
    // Clients don't need lat/lon in payload.
    const { latitude: _lat, longitude: _lon, ...rest } = payload;
    return rest;
  });

  return {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone,
    addresses,
  };
}

export function emptyClientFormDefaults(): ClientFormValues {
  return {
    name: "",
    email: "",
    phone: "",
    addresses: [emptyEntityAddressFormRow({ address_type: "billing", is_primary: true })],
  };
}

export function clientToFormDefaults(client: Client): ClientFormValues {
  const addresses = resolveClientAddresses(client);
  return {
    name: client.name ?? "",
    email: client.email ?? "",
    phone: normalizePhoneForPhoneInput(client.phone),
    addresses:
      addresses.length > 0
        ? addresses.map((addr) => mapEntityAddressApiToFormRow(addr))
        : [emptyEntityAddressFormRow({ address_type: "billing", is_primary: true })],
  };
}
