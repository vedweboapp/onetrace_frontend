import type { EntityAddress, EntityAddressPayload } from "@/shared/types/entity-address.types";
import type { UserAvailabilityPayloadRow } from "@/features/users/types/user-availability.types";

export type AppUserRef = {
  id: number;
  email: string;
  username: string;
};

export type UserBasePayType = "fixed_amount" | "rate_per_hr";

export type UserDetail = {
  /** Present on some API shapes; list endpoints often omit this and only return profile `id`. */
  id?: number;
  uuid: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_number: string | null;
  gender: string | null;
  user_image: string | null;
  invite_status: string | null;
  invitation_sent_at: string | null;
  invitation_expired: boolean;
  addresses?: EntityAddress[] | null;
  base_pay?: string | number | null;
  base_pay_type?: UserBasePayType | string | null;
  available_days?: UserAvailabilityPayloadRow[] | null;
};

export type Role = {
  id: number;
  name?: string;
  role_name?: string;
};

export type UserProfile = {
  id: number;
  user_detail: UserDetail;
  role_detail: Role | null;
  organization_detail: { id: number; uuid: string; name: string } | null;
  created_at: string;
  addresses?: EntityAddress[] | null;
  base_pay?: string | number | null;
  base_pay_type?: UserBasePayType | string | null;
  available_days?: UserAvailabilityPayloadRow[] | null;
};

export type UserPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type UserListResponse = {
  success: boolean;
  message: string;
  data: UserProfile[];
  pagination: UserPagination;
};

export type InviteUserPayload = {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  role: number;
  addresses?: EntityAddressPayload[];
  base_pay?: number | null;
  base_pay_type?: UserBasePayType | null;
  available_days?: UserAvailabilityPayloadRow[];
};

export type UpdateUserProfilePayload = Partial<{
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  role: number;
  addresses: EntityAddressPayload[];
  base_pay: number | null;
  base_pay_type: UserBasePayType | null;
  available_days?: UserAvailabilityPayloadRow[];
}>;
