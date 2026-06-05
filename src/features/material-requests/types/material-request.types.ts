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
  project?: { id: number; name?: string | null } | null;
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

export type MaterialRequestItemRef = {
  id?: number;
  job?: { id: number; title?: string | null; job_details?: string | null } | number | null;
  group?: { id: number; name?: string | null } | null;
  item?: MaterialRequestItemProductRef | number | null;
  /** @deprecated Prefer requested_quantity */
  quantity?: number | null;
  requested_quantity?: number | null;
  dispatched_quantity?: number | null;
  pending_quantity?: number | null;
  restocked_quantity?: number | null;
};

export type MaterialRequestTimelineEntry = {
  id?: number | string;
  title?: string | null;
  description?: string | null;
  occurred_at?: string | null;
  tag?: string | null;
  dispatch_id?: number | null;
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
  requested_date: string;
  status: string;
  jobs?: MaterialRequestJobRef[];
  items?: MaterialRequestItemRef[];
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
  status?: string;
  jobs: MaterialRequestJobPayload[];
  items: MaterialRequestItemPayload[];
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
