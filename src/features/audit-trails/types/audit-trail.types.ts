export type AuditTrailUserRef = {
  id?: number;
  user_id?: number;
  email?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  /** API may return a single display name. */
  name?: string | null;
  role?: string | null;
};

export type AuditTrailEntry = {
  id?: number | string;
  module?: string | null;
  action?: string | null;
  event?: string | null;
  event_type?: string | null;
  title?: string | null;
  description?: string | null;
  message?: string | null;
  details?: string | null;
  object_id?: number | null;
  record_id?: number | null;
  model_name?: string | null;
  ip_address?: string | null;
  created_at?: string | null;
  occurred_at?: string | null;
  timestamp?: string | null;
  created_by?: AuditTrailUserRef | null;
  user?: AuditTrailUserRef | null;
  actor?: AuditTrailUserRef | null;
  metadata?: Record<string, unknown> | null;
  changes?: unknown;
};

export type AuditTrailPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type AuditTrailListResponse = {
  success: boolean;
  message: string;
  data: AuditTrailEntry[];
  pagination?: AuditTrailPagination;
};
