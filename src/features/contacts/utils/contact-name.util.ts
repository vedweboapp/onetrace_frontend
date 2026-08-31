/**
 * Display helpers for contact person names (`first_name` + `last_name`, with legacy `name` fallback).
 */

export type ContactNameParts = {
  first_name?: string | null;
  last_name?: string | null;
  /** Legacy single display name. */
  name?: string | null;
  email?: string | null;
};

/** Join first + last; fall back to legacy `name`, then email. Empty string if nothing usable. */
export function formatContactName(
  contact: ContactNameParts | null | undefined,
  fallback?: string | null,
): string {
  if (contact && typeof contact === "object") {
    const first = contact.first_name?.trim() ?? "";
    const last = contact.last_name?.trim() ?? "";
    const joined = [first, last].filter(Boolean).join(" ");
    if (joined) return joined;
    const legacy = contact.name?.trim();
    if (legacy) return legacy;
    const email = contact.email?.trim();
    if (email) return email;
  }
  const fromFallback = fallback?.trim();
  return fromFallback || "";
}

/** Select / list label: formatted name, else email, else `#id`. */
export function formatContactOptionLabel(
  contact: ContactNameParts & { id: number },
): string {
  return formatContactName(contact) || `#${contact.id}`;
}

/** Split a legacy full name into first / last for form defaults. */
export function splitLegacyContactName(name: string | null | undefined): {
  first_name: string;
  last_name: string;
} {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0] ?? "", last_name: "" };
  return { first_name: parts[0] ?? "", last_name: parts.slice(1).join(" ") };
}
