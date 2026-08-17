import type { UserFormValues } from "@/features/users/schemas/user-form-schema";
import type {
  InviteUserPayload,
  UpdateUserProfilePayload,
  UserContactEmail,
  UserContactPhone,
  UserProfile,
} from "@/features/users/types/user.types";
import {
  defaultUserAvailabilityRows,
  mapUserAvailabilityToPayload,
  normalizeUserAvailabilityFromApi,
} from "@/features/users/utils/user-availability.util";
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

function pickPrimaryContact<T extends { is_primary?: boolean }>(rows: T[] | null | undefined): T | undefined {
  if (!Array.isArray(rows) || rows.length === 0) return undefined;
  return rows.find((row) => row.is_primary) ?? rows[0];
}

function resolveUserEmails(row: UserProfile): UserContactEmail[] {
  if (Array.isArray(row.emails) && row.emails.length > 0) return row.emails;
  const nested = (row.user_detail as UserProfile["user_detail"] & { emails?: UserContactEmail[] | null }).emails;
  return Array.isArray(nested) ? nested : [];
}

function resolveUserPhones(row: UserProfile): UserContactPhone[] {
  if (Array.isArray(row.phones) && row.phones.length > 0) return row.phones;
  const nested = (row.user_detail as UserProfile["user_detail"] & { phones?: UserContactPhone[] | null }).phones;
  return Array.isArray(nested) ? nested : [];
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
    date_of_birth: "",
    base_pay: "",
    base_pay_type: "fixed_amount",
    available_days: defaultUserAvailabilityRows(),
    addresses: [emptyEntityAddressFormRow({ address_type: "other", is_primary: true })],
  };
}

export function userToFormDefaults(row: UserProfile): UserFormValues {
  const addresses = resolveUserAddresses(row);
  const primaryEmail = pickPrimaryContact(resolveUserEmails(row));
  const primaryPhone = pickPrimaryContact(resolveUserPhones(row));
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
  const availabilitySource =
    row.available_days ??
    (row.user_detail as { available_days?: UserProfile["available_days"] })?.available_days;
  const dob = (row.user_detail as { date_of_birth?: string | null }).date_of_birth?.trim() ?? "";

  return {
    first_name: row.user_detail.first_name ?? "",
    last_name: row.user_detail.last_name ?? "",
    email: primaryEmail?.email?.trim() || row.user_detail.email || "",
    phone_number: primaryPhone?.phone?.trim() || row.user_detail.phone_number || "",
    gender: row.user_detail.gender ?? "",
    role: row.role_detail?.id ? String(row.role_detail.id) : "",
    date_of_birth: dob,
    email_record_id:
      typeof primaryEmail?.id === "number" && primaryEmail.id > 0 ? primaryEmail.id : undefined,
    phone_record_id:
      typeof primaryPhone?.id === "number" && primaryPhone.id > 0 ? primaryPhone.id : undefined,
    base_pay: basePay,
    base_pay_type,
    available_days: normalizeUserAvailabilityFromApi(availabilitySource ?? null),
    addresses:
      addresses.length > 0
        ? addresses.map((addr) => mapEntityAddressApiToFormRow(addr))
        : [emptyEntityAddressFormRow({ address_type: "other", is_primary: true })],
  };
}

function mapUserFormAddresses(values: UserFormValues) {
  return normalizePrimaryEntityAddresses(values.addresses).map((row) => {
    const { latitude: _lat, longitude: _lon, ...payload } = mapEntityAddressFormRowToPayload(row);
    return payload;
  });
}

function mapUserFormCore(values: UserFormValues) {
  const addresses = mapUserFormAddresses(values);
  const basePay = toNumberOrNull(values.base_pay);
  const available_days = mapUserAvailabilityToPayload(values.available_days);
  return {
    email: values.email.trim(),
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    phone_number: values.phone_number.trim(),
    gender: values.gender.trim(),
    role: Number.parseInt(values.role, 10),
    addresses,
    ...(available_days.length > 0 ? { available_days } : {}),
    ...(basePay != null
      ? { base_pay: basePay, base_pay_type: values.base_pay_type }
      : { base_pay: null, base_pay_type: null }),
  };
}

export function mapInviteUserFormToPayload(values: UserFormValues): InviteUserPayload {
  return mapUserFormCore(values);
}

export function mapUserFormToUpdatePayload(values: UserFormValues): UpdateUserProfilePayload {
  const addresses = mapUserFormAddresses(values);
  const basePay = toNumberOrNull(values.base_pay);
  const available_days = mapUserAvailabilityToPayload(values.available_days);
  const email = values.email.trim();
  const phone = values.phone_number.trim();
  const dateOfBirth = values.date_of_birth?.trim() || null;
  const role = Number.parseInt(values.role, 10);

  const emails: UserContactEmail[] = [
    {
      ...(typeof values.email_record_id === "number" && values.email_record_id > 0
        ? { id: values.email_record_id }
        : {}),
      email,
      is_primary: true,
    },
  ];
  const phones: UserContactPhone[] = [
    {
      ...(typeof values.phone_record_id === "number" && values.phone_record_id > 0
        ? { id: values.phone_record_id }
        : {}),
      phone,
      is_primary: true,
    },
  ];

  return {
    user_detail: {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      email,
      phone_number: phone,
      gender: values.gender.trim(),
      date_of_birth: dateOfBirth,
      ...(available_days.length > 0 ? { available_days } : {}),
      ...(basePay != null
        ? { base_pay: basePay, base_pay_type: values.base_pay_type }
        : { base_pay: null, base_pay_type: null }),
    },
    ...(Number.isFinite(role) && role > 0 ? { role } : {}),
    addresses,
    emails,
    phones,
  };
}
