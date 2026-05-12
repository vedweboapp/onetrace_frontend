export type QuotationUserRef = {
  id: number;
  email: string;
  username: string;
};

export type QuotationLevelRef = {
  id: number;
  name: string;
};

export type QuotationProjectRef = {
  id: number;
  name: string;
};

export type QuotationCreatePayload = {
  customer: number;
  site: number;
  quote_name: string;
  primary_customer_contact?: number | null;
  additional_customer_contact?: number | null;
  site_contact?: number | null;
  tags: number[];
  order_number?: string | null;
  due_date?: string | null;
  salesperson?: number | null;
  project_manager?: number | null;
  technicians: number[];
  description?: string | null;
  project: number;
  levels: number[];
  select_all_levels: boolean;
};

export type QuotationListItem = {
  id: number;
  created_by: QuotationUserRef | null;
  modified_by: QuotationUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  customer: number;
  site: number;
  cost_centre?: number | null;
  quote_name: string;
  primary_customer_contact: number | null;
  additional_customer_contact: number | null;
  site_contact: number | null;
  tags: number[];
  order_number: string | null;
  due_date: string | null;
  salesperson: string | number | null;
  project_manager: string | number | null;
  technicians: number[];
  description: string | null;
  project: QuotationProjectRef | number | null;
  levels: QuotationLevelRef[];
  select_all_levels: boolean;
  status: string;
  is_active: boolean;
  organization: number;
};

export type QuotationDetail = QuotationListItem & {
  salesperson?: number | string | null;
  project_manager?: number | string | null;
};

export type QuotationPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type QuotationListResponse = {
  success: boolean;
  message: string;
  data: QuotationListItem[];
  pagination: QuotationPagination;
};

export type WorkspaceUserRow = {
  id: number;
  email: string;
  username: string;
};
