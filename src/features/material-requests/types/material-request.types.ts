import type { MaterialRequestExtraDispatchItem } from "./material-request-dispatch.types";

export type MaterialRequestUserRef = {
  id: number;
  email?: string | null;
  username?: string | null;
};

export type MaterialRequestWorkerRef = {
  id: number;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export type MaterialRequestJobRef = {
  id: number;
  title?: string | null;
  serial_number?: string | null;
  project?: number | { id: number; name?: string | null } | null;
  project_id?: number | null;
  project_name?: string | null;
  client?: number | { id: number; name?: string | null } | null;
  client_id?: number | null;
  client_name?: string | null;
};

export type MaterialRequestItemProductRef = {
  id: number;
  name?: string | null;
  selling_price?: number | string | null;
  quantity?: number | null;
  stock_quantity?: number | null;
  available_stock?: number | null;
  dispatched_quantity?: number | null;
};

export type MaterialRequestItemSummary = {
  group_key: string;
  item_id: number;
  item_name: string;
  group_name?: string | null;
  requested_quantity: number;
  dispatched_quantity: number;
  fulfilled_quantity: number;
  surplus_quantity: number;
  pending_quantity: number;
  restocked_quantity: number;
  default_dispatch_quantity?: number;
};

export type MaterialRequestItemRef = {
  id?: number;
  job?: { id: number; title?: string | null; job_details?: string | null; serial_number?: string | null } | number | null;
  group?: { id: number; name?: string | null } | null;
  item?: MaterialRequestItemProductRef | number | null;
  /** Flat name from `material_request_line.item_name`. */
  item_name?: string | null;
  item_sku?: string | null;
  /** @deprecated Prefer requested_quantity */
  quantity?: number | null;
  requested_quantity?: number | null;
  dispatched_quantity?: number | null;
  pending_quantity?: number | null;
  /** Backend return-to-stock qty on the line. */
  returned_quantity?: number | null;
  restocked_quantity?: number | null;
};

export type MaterialRequestTimelineEntry = {
  id?: number | string;
  title?: string | null;
  description?: string | null;
  occurred_at?: string | null;
  tag?: string | null;
  dispatch_id?: number | null;
  actor_name?: string | null;
  actor_role?: string | null;
};

export type MaterialRequestLogEntry = MaterialRequestTimelineEntry;

export type MaterialRequestRestockLineInput = {
  line_key: string;
  quantity: number;
};

export type MaterialRequestRestockPayload = {
  lines: MaterialRequestRestockLineInput[];
};

export type MaterialRequestListItem = {
  id: number;
  request_number: string;
  worker_name?: number | MaterialRequestWorkerRef | null;
  /** Backend alias for worker — normalized to `worker_name` in API layer. */
  job_worker?: number | MaterialRequestWorkerRef | null;
  requested_date: string;
  status: string | { id?: number; name?: string; status_name?: string; bg_colour?: string; text_colour?: string } | null;
  jobs?: MaterialRequestJobRef[];
  items?: MaterialRequestItemRef[];
  /** Backend alias for lines — normalized to `items` in API layer. */
  material_request_line?: MaterialRequestItemRef[];
  job_name?: string | null;
  items_count?: number | null;
  notes?: string | null;
  created_at?: string;
};

export type MaterialRequestDetail = MaterialRequestListItem & {
  modified_by?: MaterialRequestUserRef | null;
  modified_at?: string | null;
  created_by?: MaterialRequestUserRef | null;
  /** @deprecated Use GET material-requests/{id}/logs/ */
  timeline?: MaterialRequestTimelineEntry[];
  /** Aggregated per-product quantities — preferred for detail / dispatch UI. */
  item_summaries?: MaterialRequestItemSummary[];
  extra_dispatch_items?: MaterialRequestExtraDispatchItem[];
  dispatch_ids?: number[];
  restocked_quantity?: Record<string, number>;
};

export type MaterialRequestJobPayload = {
  job: number;
};

export type MaterialRequestItemPayload = {
  job: number;
  item: number;
  quantity?: number;
};

export type MaterialRequestCreatePayload = {
  worker_name: number;
  requested_date: string;
  status?: number;
  jobs: MaterialRequestJobPayload[];
  /** Omitted on create — backend derives items from selected jobs. */
  items?: MaterialRequestItemPayload[];
  notes?: string;
};

export type MaterialRequestUpdatePayload = Partial<MaterialRequestCreatePayload>;

export type MaterialRequestPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type MaterialRequestListResponse = {
  success: boolean;
  message: string;
  data: MaterialRequestListItem[];
  pagination: MaterialRequestPagination;
};
