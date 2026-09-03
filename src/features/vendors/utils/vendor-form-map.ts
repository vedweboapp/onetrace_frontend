import type { Vendor, VendorCreatePayload } from "@/features/vendors/types/vendor.types";
import type { VendorFormValues } from "@/features/vendors/schemas/vendor-form-schema";
import { getVendorTypeIds } from "@/features/vendors/utils/vendor-nested-fields.util";
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
    type: [],
    addresses: [emptyEntityAddressFormRow({ address_type: "billing", is_primary: true })],
  };
}

export function vendorToFormDefaults(vendor: Vendor): VendorFormValues {
  const addresses = vendor.addresses ?? [];
  return {
    name: vendor.name ?? "",
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    type: getVendorTypeIds(vendor).map(String),
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
    vendor_types: values.type
      .map((id) => Number.parseInt(id, 10))
      .filter((id) => Number.isFinite(id) && id > 0),
    addresses: normalizePrimaryEntityAddresses(values.addresses).map(mapEntityAddressFormRowToPayload),
  };
}
