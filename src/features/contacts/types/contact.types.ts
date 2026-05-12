export type ContactUserRef = {
  id: number;
  email: string;
  username: string;
};

export type ContactUpsertPayload = {
  organization: number;
  name: string;
  email: string;
  phone: string;
  client: number;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export type ContactCreatePayload = ContactUpsertPayload;
export type ContactUpdatePayload = ContactUpsertPayload;

export type Contact = {
  id: number;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  name: string;
  email: string;
  phone?: string | null;
  client: number;
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
