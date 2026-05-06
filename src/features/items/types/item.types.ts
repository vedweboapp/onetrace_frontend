import type { ProjectPagination } from "@/features/projects/types/project.types";

export type ItemUserRef = {
  id: number;
  email: string;
  username: string;
};

export type ItemComponentRef = {
  child_item: number;
  quantity: number;
};

export type Item = {
  id: number;
  components?: ItemComponentRef[];
  created_by: ItemUserRef | null;
  modified_by: ItemUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at?: string | null;
  is_deleted?: boolean;

  name: string;
  sku?: string | null;
  quantity?: number | null;
  reorder_quantity?: number | null;
  is_composite: boolean;
  cost_price?: string | number | null;
  selling_price?: string | number | null;

  is_active?: boolean;
  deleted_by?: unknown;
  organization?: number;
  group?: number | null;
};

export type ItemCreatePayload = {
  name: string;
  sku: string;
  is_composite: boolean;
  quantity: number;
  cost_price: number;
  selling_price: number;
  reorder_quantity?: number;
  group?: number;
  components?: ItemComponentRef[];
};

export type ItemUpdatePayload = Partial<ItemCreatePayload>;

export type ItemListResponse = {
  success: boolean;
  message: string;
  data: Item[];
  pagination: ProjectPagination;
};

