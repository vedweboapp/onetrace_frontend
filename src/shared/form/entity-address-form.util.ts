import { City, Country, State } from "country-state-city";
import { z } from "zod";
import { zTrimmedNonEmpty } from "@/shared/form";
import {
  ENTITY_ADDRESS_TYPES,
  normalizeEntityAddressType,
  type EntityAddress,
  type EntityAddressPayload,
  type EntityAddressType,
} from "@/shared/types/entity-address.types";

export type EntityAddressFormMessages = {
  addressLine1: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  addressType: string;
  addressesMin: string;
};

/** Form-row shape (ISO codes for cascading location UI). */
export type EntityAddressFormRow = {
  /** Present when editing an existing address row from the API. */
  id?: number;
  address_type: EntityAddressType;
  address_line_1: string;
  address_line_2: string;
  country_iso: string;
  state_iso: string;
  city: string;
  pincode: string;
  latitude: string;
  longitude: string;
  is_primary: boolean;
};

export function emptyEntityAddressFormRow(overrides?: Partial<EntityAddressFormRow>): EntityAddressFormRow {
  return {
    address_type: "billing",
    address_line_1: "",
    address_line_2: "",
    country_iso: "",
    state_iso: "",
    city: "",
    pincode: "",
    latitude: "",
    longitude: "",
    is_primary: true,
    ...overrides,
  };
}

export function createEntityAddressRowSchema(messages: EntityAddressFormMessages) {
  return z
    .object({
      id: z.number().int().positive().optional(),
      address_type: z.enum(["billing", "shipping", "other"], { message: messages.addressType }),
      address_line_1: zTrimmedNonEmpty(messages.addressLine1),
      address_line_2: z.string(),
      country_iso: z
        .string()
        .trim()
        .length(2, { message: messages.country })
        .regex(/^[A-Za-z]{2}$/, { message: messages.country })
        .transform((s) => s.toUpperCase()),
      state_iso: z.string(),
      city: z.string(),
      pincode: zTrimmedNonEmpty(messages.pincode),
      latitude: z.string(),
      longitude: z.string(),
      is_primary: z.boolean(),
    })
    .superRefine((data, ctx) => {
      const subdivisions = State.getStatesOfCountry(data.country_iso);
      if (subdivisions.length > 0 && !data.state_iso?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["state_iso"], message: messages.state });
      }
      const stateTrimmed = data.state_iso?.trim() ?? "";
      const cities =
        subdivisions.length > 0 && stateTrimmed
          ? City.getCitiesOfState(data.country_iso, stateTrimmed)
          : [];
      if (cities.length > 0 && !data.city?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["city"], message: messages.city });
      }
    });
}

export function createEntityAddressesArraySchema(messages: EntityAddressFormMessages) {
  return z.array(createEntityAddressRowSchema(messages)).min(1, messages.addressesMin);
}

function countryNameFromIso(iso: string): string {
  return Country.getCountryByCode(iso)?.name ?? iso;
}

function stateNameFromIso(countryIso: string, stateIso: string): string {
  if (!countryIso || !stateIso) return stateIso;
  return State.getStatesOfCountry(countryIso).find((s) => s.isoCode === stateIso)?.name ?? stateIso;
}

function countryIsoFromName(name: string | null | undefined): string {
  const n = (name ?? "").trim().toLowerCase();
  if (!n) return "";
  return Country.getAllCountries().find((c) => c.name.toLowerCase() === n)?.isoCode ?? "";
}

function stateIsoFromName(countryIso: string, stateName: string | null | undefined): string {
  const n = (stateName ?? "").trim().toLowerCase();
  if (!countryIso || !n) return "";
  return State.getStatesOfCountry(countryIso).find((s) => s.name.toLowerCase() === n)?.isoCode ?? "";
}

export function mapEntityAddressFormRowToPayload(row: EntityAddressFormRow): EntityAddressPayload {
  const payload: EntityAddressPayload = {
    address_type: row.address_type,
    address_line_1: row.address_line_1.trim(),
    address_line_2: row.address_line_2.trim() || null,
    city: row.city.trim(),
    state: stateNameFromIso(row.country_iso, row.state_iso),
    country: countryNameFromIso(row.country_iso),
    pincode: row.pincode.trim(),
    is_primary: row.is_primary,
    latitude: row.latitude.trim() || null,
    longitude: row.longitude.trim() || null,
  };
  if (typeof row.id === "number" && row.id > 0) {
    payload.id = row.id;
  }
  return payload;
}

export function mapEntityAddressApiToFormRow(addr: Partial<EntityAddress> | null | undefined): EntityAddressFormRow {
  const countryIso = countryIsoFromName(addr?.country);
  const stateIso = stateIsoFromName(countryIso, addr?.state);
  return {
    id: typeof addr?.id === "number" && addr.id > 0 ? addr.id : undefined,
    address_type: normalizeEntityAddressType(addr?.address_type),
    address_line_1: addr?.address_line_1?.trim() ?? "",
    address_line_2: addr?.address_line_2?.trim() ?? "",
    country_iso: countryIso,
    state_iso: stateIso,
    city: addr?.city?.trim() ?? "",
    pincode: addr?.pincode?.trim() ?? "",
    latitude: addr?.latitude?.trim?.() ? String(addr.latitude).trim() : addr?.latitude != null ? String(addr.latitude) : "",
    longitude: addr?.longitude?.trim?.() ? String(addr.longitude).trim() : addr?.longitude != null ? String(addr.longitude) : "",
    is_primary: Boolean(addr?.is_primary),
  };
}

/** Ensure exactly one primary when mapping form → API. */
export function normalizePrimaryEntityAddresses(rows: EntityAddressFormRow[]): EntityAddressFormRow[] {
  if (rows.length === 0) return rows;
  const primaryIndex = rows.findIndex((r) => r.is_primary);
  return rows.map((row, index) => ({
    ...row,
    is_primary: primaryIndex >= 0 ? index === primaryIndex : index === 0,
  }));
}

export function entityAddressTypeOptions(
  t: (key: string) => string,
): Array<{ value: EntityAddressType; label: string }> {
  return ENTITY_ADDRESS_TYPES.map((value) => ({
    value,
    label: t(
      value === "billing"
        ? "addressType.billing"
        : value === "shipping"
          ? "addressType.shipping"
          : "addressType.other",
    ),
  }));
}
