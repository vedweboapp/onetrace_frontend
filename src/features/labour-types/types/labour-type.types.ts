export type LabourTypeUserRef = {
  id: number;
  email: string;
  username: string;
};

export type LabourType = {
  id: number;
  created_by: LabourTypeUserRef | null;
  modified_by: LabourTypeUserRef | null;
  created_at: string;
  modified_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
  name: string;
  description?: string | null;
  default_markup: string | number;
  default_cost_rate: string | number;
  default_sell_price: string | number;
  deleted_by: unknown;
  organization?: number | null;
};

export type LabourTypePagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type LabourTypeListResponse = {
  success: boolean;
  message: string;
  data: LabourType[];
  pagination: LabourTypePagination;
};

export type LabourTypeCreatePayload = {
  name: string;
  description?: string;
  default_markup: number;
  default_cost_rate: number;
  default_sell_price: number;
};

export type LabourTypeUpdatePayload = Partial<LabourTypeCreatePayload>;
