export type DispatchWorkerRef = {
  id: number;
  name?: string | null;
  email?: string | null;
  username?: string | null;
};

export type DispatchUserRef = {
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

export type DispatchReturnType = "unused" | "faulty";

export type DispatchLineRestockEntry = {
  quantity: number;
  restocked_at: string;
  return_type?: DispatchReturnType;
};

export type DispatchLineItem = {
  id: number;
  line_key?: string;
  material_request_line_id?: number | null;
  material_request_line?: number | null;
  job?: DispatchJobRef | null;
  item: number | {
    id: number;
    name?: string | null;
    sku?: string | null;
    stock_quantity?: number | null;
  };
  item_name?: string | null;
  item_sku?: string | null;
  quantity?: number;
  worker_name?: number | DispatchWorkerRef | null;
  requested_quantity?: number;
  dispatched_quantity?: number;
  pending_quantity?: number;
  extra_quantity?: number;
  restocked_quantity?: number;
  restock_history?: DispatchLineRestockEntry[];
  is_extra: boolean;
  dispatched_at?: string | null;
  remarks?: string | null;
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
  return_type?: DispatchReturnType;
};

export type DispatchRestockPayload = {
  lines: DispatchRestockLineInput[];
};

export type DispatchReturnSourceLine = {
  line_id: number;
  returnable_quantity: number;
};

export type DispatchReturnItem = {
  line_id: number;
  item_id: number;
  item_name?: string | null;
  job_name?: string | null;
  worker_name?: number | DispatchWorkerRef | null;
  dispatched_quantity: number;
  returned_quantity: number;
  returnable_quantity: number;
  is_extra: boolean;
  group_key?: string;
  sources?: DispatchReturnSourceLine[];
};

export type DispatchReturnItemsData = {
  dispatch_id: number;
  dispatch_order_number: string;
  material_request_id: number;
  material_request_number?: string | null;
  worker_name?: number | DispatchWorkerRef | null;
  lines: DispatchReturnItem[];
};

export type DispatchReturnToStockLineInput = {
  line_id: number;
  quantity: number;
  return_type: DispatchReturnType;
};

export type DispatchReturnToStockGroupInput = {
  group_key: string;
  quantity: number;
  return_type: DispatchReturnType;
};

export type DispatchReturnToStockPayload = {
  lines?: DispatchReturnToStockLineInput[];
  /** Per grouped row from GET return-items — backend allocates across sources. */
  groups?: DispatchReturnToStockGroupInput[];
};

export type DispatchListItem = {
  id: number;
  dispatch_order_number: string;
  material_request_id: number;
  material_request_number?: string | null;
  job_name?: string | null;
  dispatch_date: string;
  status: string;
  worker_name?: number | DispatchWorkerRef | null;
  total_qty: number;
  created_at?: string;
};

export type DispatchLineSummary = {
  group_key: string;
  item_id: number;
  item_name: string;
  is_extra: boolean;
  requested_quantity: number;
  pending_quantity: number;
  dispatched_quantity: number;
  fulfilled_quantity: number;
  surplus_quantity: number;
  restocked_quantity: number;
};

export type DispatchDetail = DispatchListItem & {
  dispatch_to?: string | null;
  /** User who performed the dispatch (id on submit; name included in API response). */
  dispatched_by?: DispatchUserRef | number | null;
  lines: DispatchLineItem[];
  /** Aggregated per-product lines — preferred for detail UI. */
  line_summaries?: DispatchLineSummary[];
  logs?: DispatchLogEntry[];
  notes?: string | null;
  created_by?: DispatchUserRef | number | null;
  modified_by?: DispatchUserRef | number | null;
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

export type WorkerReturnDatePreset =
  | "till_today"
  | "till_yesterday"
  | "this_week"
  | "custom"
  | "material_request";

export type WorkerReturnMaterialsFilters = {
  worker_name: number;
  date_preset?: WorkerReturnDatePreset;
  date_from?: string;
  date_to?: string;
  dispatch_id?: number;
  material_request_id?: number;
};

export type WorkerReturnMaterialSource = {
  dispatch_id: number;
  line_id: number;
  returnable_quantity: number;
};

/** One row per item within a material request, or per extra item (not repeated per dispatch). */
export type WorkerReturnMaterialLine = {
  group_key: string;
  item_id: number;
  item_name?: string | null;
  material_request_id: number | null;
  material_request_number?: string | null;
  is_extra: boolean;
  dispatched_quantity: number;
  returned_quantity: number;
  returnable_quantity: number;
  pending_request_quantity: number;
  sources: WorkerReturnMaterialSource[];
};

export type WorkerReturnMaterialsData = {
  worker_name: number | DispatchWorkerRef;
  date_from: string;
  date_to: string;
  material_request_id?: number | null;
  dispatch_id?: number | null;
  lines: WorkerReturnMaterialLine[];
};

export type DispatchReturnRequestStatus = "pending" | "completed" | "rejected";

export type DispatchReturnRequestLine = {
  id: number;
  dispatch_line: number;
  item: { id: number; name: string; sku?: string | null } | null;
  // Normalized helpers (populated by API normalizer)
  item_id?: number;
  item_name?: string | null;
  dispatch_id?: number;
  dispatch_order_number?: string;
  dispatch_quantity?: number;
  quantity: number;
  return_type: DispatchReturnType;
  reason?: string | null;
};

export type DispatchReturnRequest = {
  id: number;
  request_number: string;
  /** API returns `worker` (object or null); normalized to worker_name for legacy UI compat */
  worker_name: number | DispatchWorkerRef | null;
  worker?: DispatchWorkerRef | null;
  status: DispatchReturnRequestStatus;
  /** API key is `return_request_line`; normalized to `lines` */
  lines: DispatchReturnRequestLine[];
  return_request_line?: DispatchReturnRequestLine[];
  requested_at: string;
  completed_at?: string | null;
  created_at?: string | null;
};

export type CreateDispatchReturnRequestLineInput = {
  dispatch_id?: number;
  line_id?: number;
  dispatch_line?: number;
  quantity: number;
  return_type: DispatchReturnType;
  reason?: string;
};

export type CreateDispatchReturnGroupInput = {
  group_key: string;
  quantity: number;
  return_type: DispatchReturnType;
  reason?: string;
};

export type CreateDispatchReturnRequestPayload = {
  worker_name: number;
  lines?: CreateDispatchReturnRequestLineInput[];
  groups?: CreateDispatchReturnGroupInput[];
};

export type DispatchReturnRequestListFilters = {
  status?: DispatchReturnRequestStatus;
  worker_name?: number;
  search?: string;
  date_preset?: WorkerReturnDatePreset;
  date_from?: string;
  date_to?: string;
  material_request_id?: number;
  job?: number;
};
