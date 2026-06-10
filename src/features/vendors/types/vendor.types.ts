import type { VendorType } from "@/features/vendor-types/types/vendor-type.types";

export type VendorUserRef = {
  id: number;
  email: string;
  username: string;
};

export type VendorAddress = {
  id?: number;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude?: string | null;
  longitude?: string | null;
  is_primary?: boolean;
};

export type VendorTypeRef = Pick<VendorType, "id" | "name" | "bg_color" | "text_color">;

export type Vendor = {
  id: number;
  name: string;
  email: string;
  phone: string;
  type: number | VendorTypeRef | null;
  addresses: VendorAddress[];
  is_active: boolean;
  created_at: string;
  modified_at: string;
  deleted_at?: string | null;
  is_deleted?: boolean;
  created_by: VendorUserRef | null;
  modified_by: VendorUserRef | null;
  deleted_by: unknown;
};

export type VendorPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type VendorListResponse = {
  success: boolean;
  message: string;
  data: Vendor[];
  pagination: VendorPagination;
};

export type VendorAddressPayload = Omit<VendorAddress, "id">;

export type VendorCreatePayload = {
  name: string;
  email: string;
  phone: string;
  type: number;
  addresses: VendorAddressPayload[];
};

export type VendorUpdatePayload = Partial<VendorCreatePayload> & {
  is_active?: boolean;
};
