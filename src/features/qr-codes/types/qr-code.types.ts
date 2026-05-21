export type QrCodeStatus = "assigned" | "not_assigned";

export type QrCodeUserRef = {
  id: number;
  email: string;
  username: string;
};

export type QrCode = {
  id: number;
  qr_code_id: string;
  qr_image: string;
  status: QrCodeStatus;
  is_assigned: boolean;
  assigned_to_id: number | null;
  last_scanned_at: string | null;
  scan_count: number;
  created_at: string;
  modified_at: string | null;
  created_by?: QrCodeUserRef | null;
  modified_by?: QrCodeUserRef | null;
};

export type QrCodePagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type QrCodeListResponse = {
  success: boolean;
  message: string;
  data: QrCode[];
  pagination: QrCodePagination;
};

export type QrCodeGeneratePayload = {
  number_of_qr_codes: number;
};

export type QrCodeGenerateResponse = {
  success: boolean;
  message: string;
  data: QrCode[];
};
