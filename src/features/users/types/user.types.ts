export type AppUserRef = {
  id: number;
  email: string;
  username: string;
};

export type UserDetail = {
  id: number;
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
  address1?: string;
  address2?: string;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
};

export type UpdateUserProfilePayload = Partial<{
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  role: number;
  address1: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
}>;
