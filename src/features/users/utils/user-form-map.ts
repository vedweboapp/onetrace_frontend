import type { UserFormValues } from "@/features/users/schemas/user-form-schema";
import type {
  InviteUserPayload,
  UpdateUserProfilePayload,
  UserProfile,
} from "@/features/users/types/user.types";
import type { EntityAddress } from "@/shared/types/entity-address.types";
import {
  emptyEntityAddressFormRow,
  mapEntityAddressApiToFormRow,
  mapEntityAddressFormRowToPayload,
  normalizePrimaryEntityAddresses,
} from "@/shared/form/entity-address-form.util";

function toNumberOrNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function resolveUserAddresses(row: UserProfile): EntityAddress[] {
  if (Array.isArray(row.addresses) && row.addresses.length > 0) {
    return row.addresses;
  }
  const detail = row.user_detail as UserProfile["user_detail"] & {
    addresses?: EntityAddress[] | null;
  };
  if (Array.isArray(detail?.addresses) && detail.addresses.length > 0) {
    return detail.addresses;
  }
  return [];
}

export function emptyUserFormDefaults(): UserFormValues {
  return {
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    gender: "",
    role: "",
    base_pay: "",
    base_pay_type: "fixed_amount",
    addresses: [emptyEntityAddressFormRow({ address_type: "other", is_primary: true })],
  };
}

export function userToFormDefaults(row: UserProfile): UserFormValues {
  const addresses = resolveUserAddresses(row);
  const basePay =
    row.base_pay != null && String(row.base_pay).trim() !== ""
      ? String(row.base_pay)
      : row.user_detail &&
          "base_pay" in row.user_detail &&
          (row.user_detail as { base_pay?: unknown }).base_pay != null
        ? String((row.user_detail as { base_pay?: unknown }).base_pay)
        : "";
  const payTypeRaw =
    row.base_pay_type ??
    (row.user_detail && "base_pay_type" in row.user_detail
      ? (row.user_detail as { base_pay_type?: unknown }).base_pay_type
      : null);
  const base_pay_type = payTypeRaw === "rate_per_hr" ? "rate_per_hr" : "fixed_amount";

  return {
    first_name: row.user_detail.first_name ?? "",
    last_name: row.user_detail.last_name ?? "",
    email: row.user_detail.email ?? "",
    phone_number: row.user_detail.phone_number ?? "",
    gender: row.user_detail.gender ?? "",
    role: row.role_detail?.id ? String(row.role_detail.id) : "",
    base_pay: basePay,
    base_pay_type,
    addresses:
      addresses.length > 0
        ? addresses.map((addr) => mapEntityAddressApiToFormRow(addr))
        : [emptyEntityAddressFormRow({ address_type: "other", is_primary: true })],
  };
}

function mapUserFormCore(values: UserFormValues) {
  const addresses = normalizePrimaryEntityAddresses(values.addresses).map((row) => {
    const { latitude: _lat, longitude: _lon, ...payload } = mapEntityAddressFormRowToPayload(row);
    return payload;
  });
  const basePay = toNumberOrNull(values.base_pay);
  return {
    email: values.email.trim(),
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    phone_number: values.phone_number.trim(),
    gender: values.gender.trim(),
    role: Number.parseInt(values.role, 10),
    addresses,
    ...(basePay != null
      ? { base_pay: basePay, base_pay_type: values.base_pay_type }
      : { base_pay: null, base_pay_type: null }),
  };
}

export function mapInviteUserFormToPayload(values: UserFormValues): InviteUserPayload {
  return mapUserFormCore(values);
}

export function mapUserFormToUpdatePayload(values: UserFormValues): UpdateUserProfilePayload {
  return mapUserFormCore(values);
}
