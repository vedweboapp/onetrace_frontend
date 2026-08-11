import type { ProjectPagination } from "@/features/projects/types/project.types";

export type ItemUserRef = {
  id: number;
  email: string;
  username: string;
};

export type ItemComponentRef = {
  id?: number;
  child_item: number;
  quantity: number;
  is_deleted?: boolean;
};

/** Expanded installation type on item read responses. */
export type ItemInstallationTypeRef = {
  id: number;
  installation_type?: string | null;
  name?: string | null;
  bg_color?: string | null;
  bg_colour?: string | null;
  text_color?: string | null;
  text_colour?: string | null;
};

export type ItemUnitTypeRef = {
  id: number;
  name?: string | null;
  short_form?: string | null;
};

export type ItemAttachment = {
  id?: number;
  /** Absolute or relative media URL from the API. */
  file?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  content_type_value?: string | null;
  /** Legacy aliases */
  attachment?: string | null;
  file_url?: string | null;
  url?: string | null;
  created_at?: string | null;
  modified_at?: string | null;
};

export type InstallationCostType = "fixed_amount" | "rate_per_hr";
export type DimensionUnit = "cm" | "mm" | "m" | "in" | "ft";
export type WeightUnit = "kg" | "g" | "lb";

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
  installation_type?: number | ItemInstallationTypeRef | null;
  unit_type?: number | ItemUnitTypeRef | null;
  installation_cost?: string | number | null;
  installation_cost_type?: InstallationCostType | string | null;
  /** Hours needed to install this composite item. */
  installation_hours?: string | number | null;
  // Fulfilment / dimensions (backend expects separate fields)
  length?: string | number | null;
  width?: string | number | null;
  height?: string | number | null;
  // Legacy (older frontend stored dimensions as a single string)
  dimensions?: string | null;
  dimensions_unit?: DimensionUnit | string | null;
  weight?: string | number | null;
  weight_unit?: WeightUnit | string | null;
  attachments?: ItemAttachment[] | null;
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
  installation_type?: number;
  unit_type?: number;
  installation_cost?: number;
  installation_cost_type?: InstallationCostType;
  installation_hours?: number | null;
  // Fulfilment / dimensions
  length?: number | null;
  width?: number | null;
  height?: number | null;
  // Legacy
  dimensions?: string;
  dimensions_unit?: DimensionUnit | null;
  weight?: number;
  weight_unit?: WeightUnit;
  components?: ItemComponentRef[];
  attachments?: Array<{ id: number; is_deleted?: boolean }>;
};

export type ItemUpdatePayload = Partial<ItemCreatePayload>;

export type ItemListResponse = {
  success: boolean;
  message: string;
  data: Item[];
  pagination: ProjectPagination;
};

