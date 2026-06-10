import { Country, State } from "country-state-city";
import type { Vendor, VendorCreatePayload } from "@/features/vendors/types/vendor.types";
import type { VendorFormValues } from "@/features/vendors/schemas/vendor-form-schema";
import { getVendorTypeId } from "@/features/vendors/utils/vendor-nested-fields.util";

function countryNameFromIso(iso: string): string {
  return Country.getCountryByCode(iso)?.name ?? iso;
}

function stateNameFromIso(countryIso: string, stateIso: string): string {
  if (!countryIso || !stateIso) return stateIso;
  return State.getStatesOfCountry(countryIso).find((s) => s.isoCode === stateIso)?.name ?? stateIso;
}

export function emptyVendorFormDefaults(): VendorFormValues {
  return {
    name: "",
    email: "",
    phone: "",
    type: "",
    addresses: [
      {
        address_line_1: "",
        address_line_2: "",
        country_iso: "",
        state_iso: "",
        city: "",
        pincode: "",
        latitude: "",
        longitude: "",
        is_primary: true,
      },
    ],
  };
}

export function vendorToFormDefaults(vendor: Vendor): VendorFormValues {
  const typeId = getVendorTypeId(vendor);
  return {
    name: vendor.name ?? "",
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    type: typeId != null ? String(typeId) : "",
    addresses: (vendor.addresses ?? []).map((addr) => {
      const countryIso =
        Country.getAllCountries().find((c) => c.name.toLowerCase() === (addr.country ?? "").trim().toLowerCase())
          ?.isoCode ?? "";
      const stateIso =
        countryIso && addr.state
          ? State.getStatesOfCountry(countryIso).find(
              (s) => s.name.toLowerCase() === addr.state.trim().toLowerCase(),
            )?.isoCode ?? ""
          : "";
      return {
        address_line_1: addr.address_line_1 ?? "",
        address_line_2: addr.address_line_2 ?? "",
        country_iso: countryIso,
        state_iso: stateIso,
        city: addr.city ?? "",
        pincode: addr.pincode ?? "",
        latitude: addr.latitude ?? "",
        longitude: addr.longitude ?? "",
        is_primary: Boolean(addr.is_primary),
      };
    }),
  };
}

export function mapVendorFormToPayload(values: VendorFormValues): VendorCreatePayload {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    type: Number.parseInt(values.type, 10),
    addresses: values.addresses.map((row) => ({
      address_line_1: row.address_line_1.trim(),
      address_line_2: row.address_line_2.trim() || null,
      city: row.city.trim(),
      state: stateNameFromIso(row.country_iso, row.state_iso),
      country: countryNameFromIso(row.country_iso),
      pincode: row.pincode.trim(),
      latitude: row.latitude.trim() || null,
      longitude: row.longitude.trim() || null,
      is_primary: row.is_primary,
    })),
  };
}
