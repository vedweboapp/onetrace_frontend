import type {
  QuotationContactNested,
  QuotationListItem,
  QuotationSiteNested,
  QuotationTagNested,
  QuotationUserRef,
} from "@/features/quotations/types/quotation.types";
import type { Site } from "@/features/sites/types/site.types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function getQuotationCustomerId(customer: QuotationListItem["customer"] | undefined | null): number | null {
  if (customer == null) return null;
  if (typeof customer === "number" && Number.isFinite(customer) && customer > 0) return customer;
  if (isRecord(customer) && typeof customer.id === "number" && customer.id > 0) return customer.id;
  return null;
}

export function quotationCustomerLabel(
  customer: QuotationListItem["customer"] | undefined | null,
  lookupName?: string | null,
): string {
  if (customer == null) return "—";
  if (isRecord(customer) && typeof customer.name === "string") {
    const n = customer.name.trim();
    if (n) return n;
  }
  const id = getQuotationCustomerId(customer);
  if (id == null) return "—";
  const fromLookup = lookupName?.trim();
  return fromLookup || `#${id}`;
}

export function getQuotationSiteId(site: QuotationListItem["site"] | undefined | null): number | null {
  if (site == null) return null;
  if (typeof site === "number" && Number.isFinite(site) && site > 0) return site;
  if (isRecord(site) && typeof site.id === "number" && site.id > 0) return site.id;
  return null;
}

export function quotationSiteLabel(site: QuotationListItem["site"] | undefined | null, lookupName?: string | null): string {
  if (site == null) return "—";
  if (isRecord(site) && typeof site.site_name === "string") {
    const n = site.site_name.trim();
    if (n) return n;
  }
  const id = getQuotationSiteId(site);
  if (id == null) return "—";
  const fromLookup = lookupName?.trim();
  return fromLookup || `#${id}`;
}

/** Nested site row from quotation detail/list when API expands `site`. */
export function getQuotationNestedSite(site: QuotationListItem["site"] | undefined | null): QuotationSiteNested | null {
  if (site == null) return null;
  if (!isRecord(site) || typeof site.id !== "number") return null;
  if (typeof site.site_name !== "string") return null;
  return site as QuotationSiteNested;
}

export function getQuotationContactId(
  contact: number | QuotationContactNested | null | undefined,
): number | null {
  if (contact == null) return null;
  if (typeof contact === "number" && Number.isFinite(contact) && contact > 0) return contact;
  if (isRecord(contact) && typeof contact.id === "number" && contact.id > 0) return contact.id;
  return null;
}

export function quotationContactLabel(contact: number | QuotationContactNested | null | undefined): string {
  if (contact == null) return "—";
  if (typeof contact === "number") return `#${contact}`;
  if (!isRecord(contact)) return "—";
  const name = typeof contact.name === "string" ? contact.name.trim() : "";
  const email = typeof contact.email === "string" ? contact.email.trim() : "";
  const phone = typeof contact.phone === "string" ? contact.phone.trim() : "";
  const id = typeof contact.id === "number" && contact.id > 0 ? contact.id : null;
  if (name && email) return `${name} · ${email}`;
  if (name && phone) return `${name} · ${phone}`;
  if (name) return name;
  if (email) return email;
  if (phone) return phone;
  return id != null ? `#${id}` : "—";
}

export function quotationUserLabel(user: QuotationUserRef | number | string | null | undefined): string {
  if (user == null) return "—";
  if (typeof user === "number") return `#${user}`;
  if (typeof user === "string") {
    const s = user.trim();
    return s.length > 0 ? s : "—";
  }
  const u = user.username?.trim();
  const mail = user.email?.trim();
  if (u && mail) return `${u} · ${mail}`;
  if (u) return u;
  if (mail) return mail;
  if (typeof user.id === "number" && user.id > 0) return `#${user.id}`;
  return "—";
}

export function getQuotationOptionalUserId(
  user: string | number | QuotationUserRef | null | undefined,
): number | null {
  if (user == null) return null;
  if (typeof user === "number" && Number.isFinite(user) && user > 0) return user;
  if (typeof user === "string") {
    const s = user.trim();
    if (!/^\d+$/.test(s)) return null;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (isRecord(user) && typeof user.id === "number" && user.id > 0) return user.id;
  return null;
}

function technicianUserFromApi(item: Record<string, unknown>): QuotationUserRef | null {
  const id = typeof item.id === "number" ? item.id : null;
  if (id == null || id <= 0) return null;
  const email = typeof item.email === "string" ? item.email : "";
  const username = typeof item.username === "string" ? item.username : "";
  return { id, email, username: username || `#${id}` };
}

export type QuotationTechnicianEntry =
  | { kind: "user"; user: QuotationUserRef }
  | { kind: "id"; id: number };

function rawTechnicianArray(row: Pick<QuotationListItem, "technicians" | "technician">): unknown[] | undefined {
  const tech = row.technician;
  const techs = row.technicians;
  const techHasUserObjects =
    Array.isArray(tech) &&
    tech.some((x) => x !== null && typeof x === "object" && !Array.isArray(x));
  /** Prefer expanded `technician` users when both `technician` and bare-id `technicians` are present. */
  if (techHasUserObjects) return tech as unknown[];
  if (Array.isArray(techs) && techs.length > 0) return techs as unknown[];
  if (Array.isArray(tech) && tech.length > 0) return tech as unknown[];
  return undefined;
}

/** Resolves `technicians` and/or `technician` from the API into a single list. */
export function getQuotationTechnicianEntries(row: Pick<QuotationListItem, "technicians" | "technician">): QuotationTechnicianEntry[] {
  const raw = rawTechnicianArray(row);
  if (!Array.isArray(raw)) return [];
  const out: QuotationTechnicianEntry[] = [];
  for (const item of raw) {
    if (typeof item === "number" && item > 0) {
      out.push({ kind: "id", id: item });
      continue;
    }
    if (isRecord(item)) {
      const user = technicianUserFromApi(item);
      if (user) out.push({ kind: "user", user });
    }
  }
  return out;
}

export function quotationTechniciansLabel(row: Pick<QuotationListItem, "technicians" | "technician">): string {
  const entries = getQuotationTechnicianEntries(row);
  if (entries.length === 0) return "—";
  return entries
    .map((e) => {
      if (e.kind === "id") return `#${e.id}`;
      return quotationUserLabel(e.user);
    })
    .join(", ");
}

export function getQuotationTechnicianIds(row: Pick<QuotationListItem, "technicians" | "technician">): number[] {
  return getQuotationTechnicianEntries(row).map((e) => (e.kind === "user" ? e.user.id : e.id));
}

export function getQuotationTagIds(tags: QuotationListItem["tags"] | undefined): number[] {
  if (!Array.isArray(tags)) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const t of tags) {
    if (typeof t === "number" && t > 0 && !seen.has(t)) {
      seen.add(t);
      out.push(t);
      continue;
    }
    if (isRecord(t) && typeof t.id === "number" && t.id > 0 && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(t.id);
    }
  }
  return out;
}

export function quotationTagLabel(tag: number | QuotationTagNested, lookupName?: string | null): string {
  if (typeof tag === "number") {
    const n = lookupName?.trim();
    return n || `#${tag}`;
  }
  const name =
    (typeof tag.name === "string" && tag.name.trim()) ||
    (typeof tag.tag_name === "string" && tag.tag_name.trim()) ||
    lookupName?.trim();
  if (name) return name;
  if (typeof tag.id === "number" && tag.id > 0) return `#${tag.id}`;
  return "—";
}

export function quotationTagsLabels(
  tags: QuotationListItem["tags"] | undefined,
  lookupById?: Record<number, string>,
): string {
  if (!Array.isArray(tags) || tags.length === 0) return "—";
  return tags
    .map((t) => {
      const id = typeof t === "number" ? t : isRecord(t) && typeof t.id === "number" ? t.id : null;
      const lookup = id != null ? lookupById?.[id] : undefined;
      return quotationTagLabel(t, lookup ?? null);
    })
    .join(", ");
}

export function getQuotationLevelIds(levels: QuotationListItem["levels"] | undefined): number[] {
  if (!Array.isArray(levels)) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const entry of levels) {
    if (typeof entry === "number" && entry > 0 && !seen.has(entry)) {
      seen.add(entry);
      out.push(entry);
      continue;
    }
    if (entry && typeof entry === "object" && typeof entry.id === "number" && entry.id > 0 && !seen.has(entry.id)) {
      seen.add(entry.id);
      out.push(entry.id);
    }
  }
  return out;
}

/** Minimal `Site` row for maps / site snapshot when only nested quotation `site` exists. */
export function quotationNestedSiteToSite(nested: QuotationSiteNested, clientId: number): Site {
  return {
    id: nested.id,
    site_name: nested.site_name,
    address_line_1: nested.address_line_1 ?? null,
    address_line_2: nested.address_line_2 ?? null,
    city: nested.city ?? null,
    state: nested.state ?? null,
    country: nested.country ?? null,
    pincode: nested.pincode ?? null,
    client: clientId,
    created_by: null,
    modified_by: null,
    created_at: "",
    modified_at: "",
    deleted_at: null,
    is_deleted: false,
    is_active: true,
    deleted_by: null,
    organization: 0,
  };
}

export function quotationLevelsLabel(
  levels: QuotationListItem["levels"] | undefined,
  selectAllLevels: boolean,
  opts: { allSelectedLabel: string; nameById?: Record<number, string> },
): string {
  if (selectAllLevels) return opts.allSelectedLabel;
  if (!levels?.length) return "—";
  return levels
    .map((entry) => {
      if (typeof entry === "number") {
        const n = opts.nameById?.[entry]?.trim();
        return n || `#${entry}`;
      }
      const name = typeof entry.name === "string" ? entry.name.trim() : "";
      if (name) return name;
      const id = typeof entry.id === "number" ? entry.id : null;
      return id != null ? opts.nameById?.[id]?.trim() || `#${id}` : "";
    })
    .filter(Boolean)
    .join(", ");
}
