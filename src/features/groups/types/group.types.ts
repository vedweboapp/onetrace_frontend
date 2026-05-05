import type { ProjectPagination } from "@/features/projects/types/project.types";

export type GroupUserRef = {
  id: number;
  email: string;
  username: string;
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
};

export type GroupCreatePayload = {
  name: string;
};

export type GroupUpdatePayload = {
  name?: string;
};

export type GroupListResponse = {
  success: boolean;
  message: string;
  data: Group[];
  pagination: ProjectPagination;
};
