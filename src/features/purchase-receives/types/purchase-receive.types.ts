export type PurchaseReceiveUserRef = {
  id: number;
  email?: string | null;
  username?: string | null;
};

export type PurchaseReceiveVendorRef = {
  id: number;
  name?: string;
};

export type PurchaseReceiveAttachment = {
  id: number;
  file: string;
  file_name?: string | null;
  file_size?: number | null;
  content_type_value?: string | null;
  created_at?: string | null;
  modified_at?: string | null;
};

export type PurchaseReceiveLineSnapshot = {
  item_name?: string | null;
  unit_price?: string | number | null;
};

export type PurchaseReceiveLineItem = {
  id?: number;
  item: number | null;
  group?: number | null;
  ordered_quantity?: string | number | null;
  received_quantity?: string | number | null;
  billed_quantity?: string | number | null;
  purchase_order_snapshot?: PurchaseReceiveLineSnapshot | null;
};

export type PurchaseReceiveLineItemPayload = {
  item: number;
  group?: number | null;
  ordered_quantity: string;
  received_quantity: string;
  billed_quantity?: string;
  purchase_order_snapshot?: PurchaseReceiveLineSnapshot;
};

export type PurchaseReceiveListItem = {
  id: number;
  purchase_receive_number: string;
  receive_date?: string | null;
  tracking_number?: string | null;
  tracking_link?: string | null;
  total_quantity_received?: string | number | null;
  notes?: string | null;
  status: string;
  vendor?: number | PurchaseReceiveVendorRef | null;
  purchase_order?: number | { id: number; purchase_order_number?: string } | null;
  created_at?: string | null;
};

export type PurchaseReceiveDetail = PurchaseReceiveListItem & {
  line_items?: PurchaseReceiveLineItem[];
  attachments?: PurchaseReceiveAttachment[];
  created_by?: PurchaseReceiveUserRef | null;
  modified_by?: PurchaseReceiveUserRef | null;
  modified_at?: string | null;
  organization?: number | null;
};

export type PurchaseReceiveCreatePayload = {
  receive_date: string;
  tracking_number?: string;
  tracking_link?: string;
  notes?: string;
  status: string;
  purchase_receive_number?: string;
  vendor: number;
  purchase_order?: number;
  line_items: PurchaseReceiveLineItemPayload[];
};

export type PurchaseReceiveUpdatePayload = Partial<PurchaseReceiveCreatePayload>;

export type PurchaseReceivePagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type PurchaseReceiveListResponse = {
  success: boolean;
  message: string;
  data: PurchaseReceiveListItem[];
  pagination: PurchaseReceivePagination;
};
