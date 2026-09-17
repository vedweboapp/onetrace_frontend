export type UserGroupUserRef = {
  id: number;
  email?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export type UserGroup = {
  id: number;
  name: string;
  users: UserGroupUserRef[];
  created_by: UserGroupUserRef | null;
  modified_by: UserGroupUserRef | null;
  created_at: string;
  modified_at: string | null;
  is_active?: boolean;
  organization?: number | null;
};

export type UserGroupPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type UserGroupListResponse = {
  success: boolean;
  message: string;
  data: UserGroup[];
  pagination: UserGroupPagination;
};

export type UserGroupCreatePayload = {
  name: string;
  users: number[];
};

export type UserGroupUpdatePayload = Partial<UserGroupCreatePayload>;
