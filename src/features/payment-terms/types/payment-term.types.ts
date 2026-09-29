export type PaymentTermUserRef = {
  id: number;
  email: string;
  username: string;
};

export type PaymentTerm = {
  id: number;
  created_by: PaymentTermUserRef | null;
  modified_by: PaymentTermUserRef | null;
  created_at: string;
  modified_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
  payment_term_days: number;
  payment_term_label: string;
  is_default: boolean;
  payment_terms_discount_percentage: string | number;
  payment_terms_discount_due_days: number | null;
  status: string;
  type: string;
  is_system_terms: boolean;
  is_system_generated: boolean;
  deleted_by: unknown;
  organization: number | null;
};

export type PaymentTermPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type PaymentTermListResponse = {
  success: boolean;
  message: string;
  data: PaymentTerm[];
  pagination: PaymentTermPagination;
};

export type PaymentTermCreatePayload = {
  payment_term_label: string;
  payment_term_days: number;
  is_default?: boolean;
  payment_terms_discount_percentage?: number;
  payment_terms_discount_due_days?: number | null;
  type?: string;
  is_system_terms?: boolean;
};

export type PaymentTermUpdatePayload = Partial<PaymentTermCreatePayload> & {
  status?: string;
};
