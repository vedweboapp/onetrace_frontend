import { City, Country, State } from "country-state-city";
import type { UserFormValues } from "@/features/users/schemas/user-form-schema";
import type { InviteUserPayload, UpdateUserProfilePayload, UserProfile } from "@/features/users/types/user.types";

export function emptyUserFormDefaults(): UserFormValues {
  return {
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    gender: "",
    role: "",
    address1: "",
    address2: "",
    country_iso: "IN",
    state_iso: "",
    city: "",
    pincode: "",
  };
}

export function userToFormDefaults(row: UserProfile): UserFormValues {
  return {
    first_name: row.user_detail.first_name ?? "",
    last_name: row.user_detail.last_name ?? "",
    email: row.user_detail.email ?? "",
    phone_number: row.user_detail.phone_number ?? "",
    gender: row.user_detail.gender ?? "",
    role: row.role_detail?.id ? String(row.role_detail.id) : "",
    address1: "",
    address2: "",
    country_iso: "IN",
    state_iso: "",
    city: "",
    pincode: "",
  };
}

export function mapInviteUserFormToPayload(values: UserFormValues): InviteUserPayload {
  const country = Country.getCountryByCode(values.country_iso);
  const subdivisions = State.getStatesOfCountry(values.country_iso);
  const stateTrimmed = values.state_iso.trim();
  const stateName =
    subdivisions.length > 0
      ? subdivisions.find((s) => s.isoCode === stateTrimmed)?.name ?? stateTrimmed
      : "";
  const cities =
    subdivisions.length > 0 && stateTrimmed ? City.getCitiesOfState(values.country_iso, stateTrimmed) : [];
  const cityName = cities.length > 0 ? values.city.trim() : "";

  return {
    email: values.email.trim(),
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    phone_number: values.phone_number.trim(),
    gender: values.gender.trim(),
    role: Number.parseInt(values.role, 10),
    address1: values.address1?.trim() || "",
    address2: values.address2?.trim() || "",
    country: country?.name ?? values.country_iso,
    state: stateName,
    city: cityName,
    pincode: values.pincode?.trim() || "",
  };
}

export function mapUserFormToUpdatePayload(values: UserFormValues): UpdateUserProfilePayload {
  const country = Country.getCountryByCode(values.country_iso);
  const subdivisions = State.getStatesOfCountry(values.country_iso);
  const stateTrimmed = values.state_iso.trim();
  const stateName =
    subdivisions.length > 0
      ? subdivisions.find((s) => s.isoCode === stateTrimmed)?.name ?? stateTrimmed
      : "";
  const cities =
    subdivisions.length > 0 && stateTrimmed ? City.getCitiesOfState(values.country_iso, stateTrimmed) : [];
  const cityName = cities.length > 0 ? values.city.trim() : "";

  return {
    email: values.email.trim(),
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    phone_number: values.phone_number.trim(),
    gender: values.gender.trim(),
    role: Number.parseInt(values.role, 10),
    address1: values.address1?.trim() || "",
    address2: values.address2?.trim() || "",
    country: country?.name ?? values.country_iso,
    state: stateName,
    city: cityName,
    pincode: values.pincode?.trim() || "",
  };
}
