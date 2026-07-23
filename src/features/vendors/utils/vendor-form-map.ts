import type { Vendor, VendorCreatePayload } from "@/features/vendors/types/vendor.types";
import type { VendorFormValues } from "@/features/vendors/schemas/vendor-form-schema";
import { getVendorTypeId } from "@/features/vendors/utils/vendor-nested-fields.util";
import {
  emptyEntityAddressFormRow,
  mapEntityAddressApiToFormRow,
  mapEntityAddressFormRowToPayload,
  normalizePrimaryEntityAddresses,
} from "@/shared/form/entity-address-form.util";

export function emptyVendorFormDefaults(): VendorFormValues {
  return {
    name: "",
    email: "",
    phone: "",
    type: "",
    addresses: [emptyEntityAddressFormRow({ address_type: "billing", is_primary: true })],
  };
}

export function vendorToFormDefaults(vendor: Vendor): VendorFormValues {
  const typeId = getVendorTypeId(vendor);
  const addresses = vendor.addresses ?? [];
  return {
    name: vendor.name ?? "",
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    type: typeId != null ? String(typeId) : "",
    addresses:
      addresses.length > 0
        ? addresses.map((addr) => mapEntityAddressApiToFormRow(addr))
        : [emptyEntityAddressFormRow({ address_type: "billing", is_primary: true })],
  };
}

export function mapVendorFormToPayload(values: VendorFormValues): VendorCreatePayload {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    type: Number.parseInt(values.type, 10),
    addresses: normalizePrimaryEntityAddresses(values.addresses).map(mapEntityAddressFormRowToPayload),
  };
}
