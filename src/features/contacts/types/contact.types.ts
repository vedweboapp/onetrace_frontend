import type { EntityAddress, EntityAddressPayload } from "@/shared/types/entity-address.types";

export type ContactUserRef = {
  id: number;
  email: string;
  username: string;
};

export type ContactType = "client" | "vendor";

export type ContactClientRef = {
  id: number;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type ContactVendorRef = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
};

export type ContactAddress = EntityAddress;
export type ContactAddressPayload = EntityAddressPayload;

export type ContactUpsertPayload = {
  organization?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  contact_type: ContactType;
  client?: number;
  vendor?: number;
  addresses: ContactAddressPayload[];
};

export type ContactCreatePayload = ContactUpsertPayload;
export type ContactUpdatePayload = ContactUpsertPayload;

export type Contact = {
  id: number;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  first_name?: string | null;
  last_name?: string | null;
  /** Legacy single display name (read fallback only). */
  name?: string | null;
  email: string;
  phone?: string | null;
  contact_type?: ContactType;
  client?: number | ContactClientRef | null;
  vendor?: number | ContactVendorRef | null;
  /** Multi-address API shape. */
  addresses?: ContactAddress[] | null;
  /** Legacy flat fields (read fallback only). */
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  is_active: boolean;
  created_by: ContactUserRef | number | null;
  modified_by: ContactUserRef | number | null;
  deleted_by: ContactUserRef | number | null;
  organization: number;
};

export type ContactPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type ContactListResponse = {
  success: boolean;
  message: string;
  data: Contact[];
  pagination: ContactPagination;
};
