export type RejectionReasonUserRef = {
  id: number;
  email: string;
  username: string;
};

export type RejectionReason = {
  id: number;
  created_by: RejectionReasonUserRef | null;
  modified_by: RejectionReasonUserRef | null;
  created_at: string;
  modified_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
  name: string;
  is_system_generated: boolean;
  is_active: boolean;
  deleted_by: unknown;
  organization: number | null;
};

export type RejectionReasonPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type RejectionReasonListResponse = {
  success: boolean;
  message: string;
  data: RejectionReason[];
  pagination: RejectionReasonPagination;
};

export type RejectionReasonCreatePayload = {
  name: string;
};

export type RejectionReasonUpdatePayload = Partial<RejectionReasonCreatePayload> & {
  is_active?: boolean;
};
