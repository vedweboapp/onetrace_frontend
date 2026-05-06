import type { ProjectPagination } from "@/features/projects/types/project.types";

export type GroupUserRef = {
  id: number;
  email: string;
  username: string;
};

export type GroupCompositeItemRef = {
  composite_item: number;
  abbreviation: string;
  composite_item_name?: string;
};

export type Group = {
  id: number;
  created_by: GroupUserRef | null;
  modified_by: GroupUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  name: string;
  is_active: boolean;
  deleted_by: unknown;
  organization: number;
  composite_items?: GroupCompositeItemRef[];
};

export type GroupCreatePayload = {
  name: string;
  composite_items?: GroupCompositeItemRef[];
};

export type GroupUpdatePayload = {
  name?: string;
  composite_items?: GroupCompositeItemRef[];
};

export type GroupListResponse = {
  success: boolean;
  message: string;
  data: Group[];
  pagination: ProjectPagination;
};
