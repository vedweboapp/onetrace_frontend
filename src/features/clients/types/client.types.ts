export type ClientUserRef = {
  id: number;
  email: string;
  username: string;
};


export type ClientUpsertPayload = {
  organization: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export type ClientCreatePayload = ClientUpsertPayload;
export type ClientUpdatePayload = ClientUpsertPayload;

export type Client = {
  id: number;
  created_by: ClientUserRef | null;
  modified_by: ClientUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  name: string;
  contact_person: string;
  email: string;
  phone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  /** Legacy combined address (some responses may omit structured fields). */
  address?: string | null;
  is_active: boolean;
  deleted_by: unknown;
  organization: number;
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
