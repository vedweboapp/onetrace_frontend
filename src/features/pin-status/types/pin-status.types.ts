export type PinStatusUserRef = {
  id: number;
  email: string;
  username: string;
};

export type PinStatus = {
  id: number;
  created_by: PinStatusUserRef | null;
  modified_by: PinStatusUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  status_name: string;
  bg_colour: string;
  text_colour: string;
  is_active: boolean;
  deleted_by: unknown;
  organization: number;
};

export type PinStatusPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type PinStatusListResponse = {
  success: boolean;
  message: string;
  data: PinStatus[];
  pagination: PinStatusPagination;
};

export type PinStatusCreatePayload = {
  status_name: string;
  bg_colour: string;
  text_colour: string;
};

export type PinStatusUpdatePayload = Partial<PinStatusCreatePayload>;
