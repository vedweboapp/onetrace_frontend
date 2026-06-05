export type DispatchWorkerRef = {
  id: number;
  name?: string | null;
  email?: string | null;
  username?: string | null;
};

export type DispatchJobRef = {
  id: number;
  title?: string | null;
  project?: { id: number; name?: string | null } | null;
};

export type DispatchLineRestockEntry = {
  quantity: number;
  restocked_at: string;
};

export type DispatchLineItem = {
  id: number;
  line_key: string;
  material_request_line_id?: number | null;
  job?: DispatchJobRef | null;
  item: {
    id: number;
    name?: string | null;
    stock_quantity?: number | null;
  };
  worker_name?: number | DispatchWorkerRef | null;
  requested_quantity: number;
  dispatched_quantity: number;
  pending_quantity: number;
  extra_quantity: number;
  restocked_quantity: number;
  restock_history: DispatchLineRestockEntry[];
  is_extra: boolean;
  dispatched_at?: string | null;
};

export type DispatchLogEntry = {
  id: string;
  title?: string | null;
  description?: string | null;
  occurred_at?: string | null;
  tag?: string | null;
  line_id?: number | null;
};

export type DispatchRestockLineInput = {
  line_id: number;
  quantity: number;
};

export type DispatchRestockPayload = {
  lines: DispatchRestockLineInput[];
};

export type DispatchListItem = {
  id: number;
  dispatch_number: string;
  material_request_id: number;
  material_request_number?: string | null;
  job_name?: string | null;
  dispatch_date: string;
  status: string;
  worker_name?: number | DispatchWorkerRef | null;
  total_qty: number;
  created_at?: string;
};

export type DispatchDetail = DispatchListItem & {
  dispatch_to?: string | null;
  lines: DispatchLineItem[];
  logs?: DispatchLogEntry[];
  notes?: string | null;
  created_by?: { id: number; email?: string | null; username?: string | null } | null;
  modified_by?: { id: number; email?: string | null; username?: string | null } | null;
  modified_at?: string | null;
};

export type DispatchPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type DispatchListResponse = {
  success: boolean;
  message: string;
  data: DispatchListItem[];
  pagination: DispatchPagination;
};
