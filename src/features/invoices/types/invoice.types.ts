export type InvoiceUserRef = {
  id: number;
  email?: string | null;
  username?: string | null;
};

export type InvoiceClientRef = {
  id: number;
  name?: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type InvoiceContactRef = {
  id: number;
  name?: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type InvoiceAddress = {
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  pincode?: string | null;
  country?: string | null;
};

export type InvoiceLineItem = {
  id?: number;
  product?: number | null;
  product_name?: string | null;
  description?: string | null;
  quantity: number;
  unit?: string | null;
  list_price?: number | string | null;
  rate?: number | string | null;
  amount?: number | string | null;
  discount?: number | string | null;
  tax?: number | string | null;
  tax_rate?: number | string | null;
  total?: number | string | null;
};

export type InvoiceCompositeGroupRef = {
  id: number;
  name?: string;
};

export type InvoiceCompositeItem = {
  id?: number;
  name?: string;
  group?: InvoiceCompositeGroupRef | number | null;
  quantity: number;
  amount?: number;
  line_total?: number | string | null;
  /** Legacy read paths. */
  item?: { id: number; name?: string | null; selling_price?: number | string | null } | number | null;
};

export type InvoiceListItem = {
  id: number;
  invoice_number: string;
  client?: number | InvoiceClientRef;
  project?: { id: number; name?: string | null } | number | null;
  project_name?: string | null;
  job_name?: string | null;
  sub_total?: number | string | null;
  total_balance?: number | string | null;
  total?: number | string | null;
  amount?: number | string | null;
  issue_date: string;
  due_date?: string | null;
  payment_terms?: string | null;
  status: string;
  created_at?: string;
};

export type InvoiceDetail = InvoiceListItem & {
  contact?: number | InvoiceContactRef | null;
  contact_person?: string | InvoiceContactRef | null;
  due_date?: string | null;
  payment_terms?: string | null;
  bill_to?: InvoiceAddress | null;
  ship_to?: InvoiceAddress | null;
  billing_address?: InvoiceAddress | null;
  shipping_address?: InvoiceAddress | null;
  notes_and_terms?: string | null;
  client_notes?: string | null;
  internal_notes?: string | null;
  subtotal?: number | string | null;
  tax_total?: number | string | null;
  tax_percent?: number | string | null;
  adjustment?: number | string | null;
  total_balance?: number | string | null;
  line_items?: InvoiceLineItem[];
  composite_items?: InvoiceCompositeItem[];
  created_by?: InvoiceUserRef | null;
  modified_by?: InvoiceUserRef | null;
  modified_at?: string | null;
};

export type InvoiceLineItemPayload = {
  id?: number;
  product?: number;
  description?: string;
  quantity: number;
  unit?: string;
  list_price?: number;
  rate?: number;
  amount?: number;
  discount?: number;
  tax?: number;
  tax_rate?: number;
};

export type InvoiceCompositeItemPayload = {
  id: number;
  name?: string;
  group?: InvoiceCompositeGroupRef | null;
  quantity: number;
  amount?: number;
};

export type InvoiceCreatePayload = {
  client: number;
  contact?: number;
  invoice_number?: string;
  project?: number;
  issue_date?: string;
  due_date?: string;
  payment_terms?: string;
  total?: number;
  bill_to?: InvoiceAddress;
  ship_to?: InvoiceAddress;
  notes_and_terms?: string;
  client_notes?: string;
  internal_notes?: string;
  adjustment?: number;
  composite_items?: InvoiceCompositeItemPayload[];
  line_items?: InvoiceLineItemPayload[];
};

export type InvoiceUpdatePayload = Partial<InvoiceCreatePayload>;

export type InvoicePagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type InvoiceListResponse = {
  success: boolean;
  message: string;
  data: InvoiceListItem[];
  pagination: InvoicePagination;
};
