export type PaymentModeUserRef = {
  id: number;
  email: string;
  username: string;
};

export type PaymentMode = {
  id: number;
  created_by: PaymentModeUserRef | null;
  modified_by: PaymentModeUserRef | null;
  created_at: string;
  modified_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
  name: string;
  system_name: string;
  is_default: boolean;
  is_mandatory: boolean;
  is_system_generated: boolean;
  deleted_by: unknown;
  organization: number | null;
};

export type PaymentModePagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type PaymentModeListResponse = {
  success: boolean;
  message: string;
  data: PaymentMode[];
  pagination: PaymentModePagination;
};

export type PaymentModeCreatePayload = {
  name: string;
  system_name: string;
  is_default?: boolean;
  is_mandatory?: boolean;
};

export type PaymentModeUpdatePayload = Partial<PaymentModeCreatePayload>;
