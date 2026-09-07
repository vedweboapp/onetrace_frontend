export type Profile = {
  id: number;
  profile_name: string;
  profile_type?: string | null;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProfilePayload = {
  profile_name: string;
  profile_type?: string | null;
  description?: string | null;
};

export type ProfileFormValues = {
  profile_name: string;
  profile_type: string;
  description: string;
};
