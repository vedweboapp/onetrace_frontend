import type { EntityAddress, EntityAddressPayload } from "@/shared/types/entity-address.types";

export type ClientUserRef = {
  id: number;
  email: string;
  username: string;
};

export type ClientAddress = EntityAddress;
export type ClientAddressPayload = EntityAddressPayload;

export type ClientUpsertPayload = {
  organization?: number;
  name: string;
  email: string;
  phone: string;
  addresses: ClientAddressPayload[];
};

export type ClientCreatePayload = ClientUpsertPayload;
export type ClientUpdatePayload = ClientUpsertPayload;

export type Client = {
  id: number;
  created_by: ClientUserRef | null;
  modified_by: ClientUserRef | null;
  created_at?: string | null;
  modified_at?: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
  name: string;
  email: string;
  phone?: string | null;
  /** Multi-address API shape. */
  addresses?: ClientAddress[] | null;
  /** Legacy flat fields (read fallback only). */
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  address?: string | null;
  is_active: boolean;
  deleted_by: unknown;
  organization?: number;
};

export type ClientPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type ClientListResponse = {
  success: boolean;
  message: string;
  data: Client[];
  pagination: ClientPagination;
};
