export type VendorTypeUserRef = {
  id: number;
  email: string;
  username: string;
};

export type VendorType = {
  id: number;
  created_by: VendorTypeUserRef | null;
  modified_by: VendorTypeUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  name: string;
  bg_color: string;
  text_color: string;
  is_active: boolean;
  deleted_by: unknown;
  organization?: number;
};

export type VendorTypePagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type VendorTypeListResponse = {
  success: boolean;
  message: string;
  data: VendorType[];
  pagination: VendorTypePagination;
};

export type VendorTypeCreatePayload = {
  name: string;
  bg_color: string;
  text_color: string;
};

export type VendorTypeUpdatePayload = Partial<VendorTypeCreatePayload> & {
  is_active?: boolean;
};
