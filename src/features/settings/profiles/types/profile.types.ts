export type ProfileRoleRef = {
  id: number;
  role_name?: string | null;
  name?: string | null;
};

export type Profile = {
  id: number;
  profile_name: string;
  profile_type?: string | null;
  description?: string | null;
  role?: number | ProfileRoleRef | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProfilePayload = {
  profile_name: string;
  profile_type?: string | null;
  description?: string | null;
  role?: number | null;
};
