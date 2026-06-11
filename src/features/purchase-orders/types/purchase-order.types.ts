export type PurchaseOrderUserRef = {
  id: number;
  email?: string | null;
  username?: string | null;
};

export type PurchaseOrderVendorRef = {
  id: number;
  name?: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type PurchaseOrderContactRef = {
  id: number;
  name?: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type PurchaseOrderAddress = {
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  pincode?: string | null;
  country?: string | null;
};

export type PurchaseOrderCompositeGroupRef = {
  id: number;
  name?: string;
};

export type PurchaseOrderCompositeItem = {
  id?: number;
  name?: string;
  group?: PurchaseOrderCompositeGroupRef | number | null;
  quantity: number;
  amount?: number;
  line_total?: number | string | null;
  item?: { id: number; name?: string | null; selling_price?: number | string | null } | number | null;
};

export type PurchaseOrderListItem = {
  id: number;
  purchase_order_number: string;
  vendor?: number | PurchaseOrderVendorRef;
  project?: { id: number; name?: string | null } | number | null;
  project_name?: string | null;
  sub_total?: number | string | null;
  adjustment_amount?: number | string | null;
  total_balance?: number | string | null;
  total?: number | string | null;
  issue_date: string;
  due_date?: string | null;
  payment_terms?: string | null;
  status: string;
  created_at?: string;
};

export type PurchaseOrderDetail = PurchaseOrderListItem & {
  contact?: number | PurchaseOrderContactRef | null;
  bill_to?: PurchaseOrderAddress | null;
  ship_to?: PurchaseOrderAddress | null;
  vendor_notes?: string | null;
  internal_notes?: string | null;
  composite_items?: PurchaseOrderCompositeItem[];
  created_by?: PurchaseOrderUserRef | null;
  modified_by?: PurchaseOrderUserRef | null;
  modified_at?: string | null;
};

export type PurchaseOrderCompositeItemPayload = {
  id: number;
  name?: string;
  group?: PurchaseOrderCompositeGroupRef | null;
  quantity: number;
  amount?: number;
};

export type PurchaseOrderCreatePayload = {
  vendor: number;
  contact?: number;
  project?: number;
  due_date?: string;
  payment_terms?: string;
  total?: number;
  bill_to?: PurchaseOrderAddress;
  ship_to?: PurchaseOrderAddress;
  vendor_notes?: string;
  internal_notes?: string;
  composite_items?: PurchaseOrderCompositeItemPayload[];
};

export type PurchaseOrderUpdatePayload = Partial<PurchaseOrderCreatePayload>;

export type PurchaseOrderPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type PurchaseOrderListResponse = {
  success: boolean;
  message: string;
  data: PurchaseOrderListItem[];
  pagination: PurchaseOrderPagination;
};
