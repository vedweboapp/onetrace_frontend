import type { OrganizationDetails, UpdateOrganizationRequest } from "../types/types";

export const ORGANIZATION_TAB_FIELDS = [
  "logo",
  "name",
  "size",
  "description",
  "website",
  "timezone",
  "street",
  "city",
  "state",
  "zip",
  "country",
] as const satisfies readonly (keyof OrganizationDetails)[];

export const CURRENCY_TAB_FIELDS = [
  "currencyCode",
  "currencyName",
  "formatType",
  "symbol",
  "symbolPosition",
  "digitSeparator",
  "decimalPlaces",
] as const satisfies readonly (keyof OrganizationDetails)[];

export const SCHEDULE_TAB_FIELDS = [
  "workingDays",
  "startTime",
  "endTime",
  "breakDuration",
] as const satisfies readonly (keyof OrganizationDetails)[];

type DirtyFieldKey = keyof UpdateOrganizationRequest;

const normalizeWorkingDays = (days?: string[]) =>
  [...(days ?? [])].map((d) => d.toLowerCase().trim()).sort();

const isFieldDirty = (
  key: DirtyFieldKey,
  initial: OrganizationDetails,
  current: OrganizationDetails,
): boolean => {
  const prev = initial[key];
  const next = current[key];

  if (key === "logo") {
    if (current.logo instanceof File) return true;
    if (initial.logo instanceof File) return true;
    return String(initial.logo ?? "") !== String(current.logo ?? "");
  }

  if (key === "workingDays") {
    const a = normalizeWorkingDays(prev as string[] | undefined);
    const b = normalizeWorkingDays(next as string[] | undefined);
    return JSON.stringify(a) !== JSON.stringify(b);
  }

  if (key === "decimalPlaces") {
    return Number(prev ?? 0) !== Number(next ?? 0);
  }

  return String(prev ?? "") !== String(next ?? "");
};

/** Returns only organization fields that changed vs initial. */
export const buildDirtyOrganizationPatch = (
  initial: OrganizationDetails,
  current: OrganizationDetails,
  fields: readonly DirtyFieldKey[],
): Partial<UpdateOrganizationRequest> => {
  const patch: Partial<UpdateOrganizationRequest> = {};

  for (const key of fields) {
    if (isFieldDirty(key, initial, current)) {
      (patch as Record<string, unknown>)[key] = current[key];
    }
  }

  return patch;
};

export const hasDirtyFields = (
  patch: Partial<UpdateOrganizationRequest>,
): boolean => Object.keys(patch).length > 0;
