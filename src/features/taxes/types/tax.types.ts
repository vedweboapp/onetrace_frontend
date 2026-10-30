export type TaxUserRef = {
  id: number;
  email: string;
  username: string;
};

export type Tax = {
  id: number;
  tax_name: string;
  tax_percentage: string | number;
  is_active: boolean;
  created_by?: TaxUserRef | null;
  modified_by?: TaxUserRef | null;
  created_at?: string;
  modified_at?: string | null;
  deleted_at?: string | null;
  is_deleted?: boolean;
  is_system_generated?: boolean;
  deleted_by?: unknown;
  organization?: number | null;
};

export type TaxPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type TaxListResponse = {
  success: boolean;
  message: string;
  data: Tax[];
  pagination: TaxPagination;
};

export type TaxCreatePayload = {
  tax_name: string;
  tax_percentage: string | number;
  is_active?: boolean;
};

export type TaxUpdatePayload = Partial<TaxCreatePayload>;

