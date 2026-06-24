import type { Site, SiteContactPerson } from "@/features/sites/types/site.types";
import type { SiteContactPersonTitle } from "@/features/sites/constants/site-contact-person.constants";

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
    const name = contact.name?.trim();
    if (name) return name;
    const email = contact.email?.trim();
    if (email) return email;
    return `#${contact.id}`;
  }
  const id = getSiteContactPersonContactId(contact);
  if (id && contactNameById?.[id]) return contactNameById[id];
  return id ? `#${id}` : "—";
}

export function isSiteContactPersonTitle(value: string): value is SiteContactPersonTitle {
  return value === "site_contact" || value === "finance" || value === "emergency";
}

export function normalizeSiteContactPersonsFromApi(site: Site): SiteContactPerson[] {
  const rows = site.contacts ?? site.site_contact_persons ?? site.contact_persons ?? [];
  return Array.isArray(rows) ? rows : [];
}

export function siteContactPersonPairKey(title: string, contact: string): string {
  return `${title.trim()}:${contact.trim()}`;
}

export type SiteContactPersonRow = { title?: string; contact?: string };

/** Returns row indices that duplicate an earlier title + contact pair. */
export function findDuplicateSiteContactPersonIndices(rows: SiteContactPersonRow[]): number[] {
  const seen = new Map<string, number>();
  const duplicates: number[] = [];

  rows.forEach((row, index) => {
    const title = row.title?.trim() ?? "";
    const contact = row.contact?.trim() ?? "";
    if (!title || !contact) return;

    const key = siteContactPersonPairKey(title, contact);
    if (seen.has(key)) {
      duplicates.push(index);
    } else {
      seen.set(key, index);
    }
  });

  return duplicates;
}
