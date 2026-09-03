import type { Site, SiteContactPerson, SiteContactPersonTitle } from "@/features/sites/types/site.types";
import { formatContactName } from "@/features/contacts/utils/contact-name.util";

export function getSiteContactPersonContactId(
  contact: SiteContactPerson["contact"],
): number | null {
  if (typeof contact === "number" && Number.isFinite(contact) && contact > 0) return contact;
  if (contact && typeof contact === "object" && Number.isFinite(contact.id) && contact.id > 0) {
    return contact.id;
  }
  return null;
}

export function formatSiteContactPersonContactLabel(
  contact: SiteContactPerson["contact"],
  contactNameById?: Record<number, string>,
): string {
  if (contact && typeof contact === "object") {
    const name = formatContactName(contact);
    if (name) return name;
    return `#${contact.id}`;
  }
  const id = getSiteContactPersonContactId(contact);
  if (id && contactNameById?.[id]) return contactNameById[id];
  return id ? `#${id}` : "—";
}

export function isSiteContactPersonTitle(value: string): value is SiteContactPersonTitle {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeSiteContactPersonsFromApi(site: Site): SiteContactPerson[] {
  const rows = site.contacts ?? site.site_contact_persons ?? site.contact_persons ?? [];
  return Array.isArray(rows) ? rows : [];
}
