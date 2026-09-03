import type { VendorType } from "@/features/vendor-types/types/vendor-type.types";
import type { EntityAddress, EntityAddressPayload } from "@/shared/types/entity-address.types";

export type VendorUserRef = {
  id: number;
  email: string;
  username: string;
};

export type VendorAddress = EntityAddress;
export type VendorAddressPayload = EntityAddressPayload;

export type VendorTypeRef = Pick<VendorType, "id" | "name" | "bg_color" | "text_color">;

export type VendorTypeValue = number | VendorTypeRef | Array<number | VendorTypeRef> | null;

export type Vendor = {
  id: number;
  name: string;
  email: string;
  phone: string;
  /** @deprecated Prefer `vendor_types` from API responses. */
  type?: VendorTypeValue;
  types?: VendorTypeValue;
  vendor_types?: VendorTypeValue;
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

export type VendorCreatePayload = {
  name: string;
  email: string;
  phone: string;
  vendor_types: number[];
  addresses: VendorAddressPayload[];
};

export type VendorUpdatePayload = Partial<VendorCreatePayload> & {
  is_active?: boolean;
};
