export type SiteUserRef = {
  id: number;
  email: string;
  username: string;
};

export type SiteUpsertPayload = {
  organization: number;
  site_name: string;
  client: number;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export type SiteCreatePayload = SiteUpsertPayload;
export type SiteUpdatePayload = SiteUpsertPayload;

export type Site = {
  id: number;
  created_by: SiteUserRef | null;
  modified_by: SiteUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  site_name: string;
  client: number;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  is_active: boolean;
  deleted_by: unknown;
  organization: number;
};

export type SitePagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type SiteListResponse = {
  success: boolean;
  message: string;
  data: Site[];
  pagination: SitePagination;
};
