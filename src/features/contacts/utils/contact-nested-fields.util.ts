import type { Contact, ContactType } from "@/features/contacts/types/contact.types";

export function getContactType(contact: Pick<Contact, "contact_type" | "vendor" | "client">): ContactType {
  if (contact.contact_type === "vendor" || contact.contact_type === "client") return contact.contact_type;
  if (contact.vendor != null) {
    const vendorId = typeof contact.vendor === "number" ? contact.vendor : contact.vendor?.id;
    if (typeof vendorId === "number" && vendorId > 0) return "vendor";
  }
  return "client";
}

export function getContactClientId(contact: Pick<Contact, "client">): number | null {
  if (typeof contact.client === "number" && contact.client > 0) return contact.client;
  if (contact.client && typeof contact.client === "object" && contact.client.id > 0) return contact.client.id;
  return null;
}

export function getContactVendorId(contact: Pick<Contact, "vendor">): number | null {
  if (typeof contact.vendor === "number" && contact.vendor > 0) return contact.vendor;
  if (contact.vendor && typeof contact.vendor === "object" && contact.vendor.id > 0) return contact.vendor.id;
  return null;
}

export function contactClientName(
  contact: Pick<Contact, "client">,
  clientNameById: Record<number, string>,
): string {
  if (contact.client && typeof contact.client === "object" && contact.client.name?.trim()) {
    return contact.client.name.trim();
  }
  const id = getContactClientId(contact);
  if (id && clientNameById[id]) return clientNameById[id];
  return id ? `#${id}` : "—";
}

export function contactVendorName(
  contact: Pick<Contact, "vendor">,
  vendorNameById: Record<number, string>,
): string {
  if (contact.vendor && typeof contact.vendor === "object" && contact.vendor.name?.trim()) {
    return contact.vendor.name.trim();
  }
  const id = getContactVendorId(contact);
  if (id && vendorNameById[id]) return vendorNameById[id];
  return id ? `#${id}` : "—";
}

export function contactParentName(
  contact: Contact,
  labels: { clientNameById: Record<number, string>; vendorNameById: Record<number, string> },
): string {
  return getContactType(contact) === "vendor"
    ? contactVendorName(contact, labels.vendorNameById)
    : contactClientName(contact, labels.clientNameById);
}
