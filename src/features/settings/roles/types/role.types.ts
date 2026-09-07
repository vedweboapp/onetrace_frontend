export type Role = {
  id: number;
  role_name: string;
  name?: string;
  parent_role?: number | null;
  parent_role_detail?: Role | null;
  parent_role_details?: Role | null;
  description?: string | null;
  shared_data_with_peers?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type RolePayload = {
  role_name: string;
  parent_role?: number | null;
  description?: string | null;
  shared_data_with_peers?: boolean;
};

export type RoleFormValues = {
  role_name: string;
  parent_role: string;
  description: string;
  shared_data_with_peers: boolean;
};
