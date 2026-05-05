import type { ProjectPagination } from "@/features/projects/types/project.types";

export type CompositeItemUserRef = {
  id: number;
  email: string;
  username: string;
};

export type CompositeItem = {
  id: number;
  created_by: CompositeItemUserRef | null;
  modified_by: CompositeItemUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  name: string;
  is_active: boolean;
  deleted_by: unknown;
  group: number;
  organization: number;
};

export type CompositeItemCreatePayload = {
  name: string;
  group: number;
};

export type CompositeItemUpdatePayload = {
  name?: string;
  group?: number;
};

export type CompositeItemListResponse = {
  success: boolean;
  message: string;
  data: CompositeItem[];
  pagination: ProjectPagination;
};
