export type QuotationUserRef = {
  id: number;
  email: string;
  username: string;
};

/** Client row when the quotation API expands `customer`. */
export type QuotationClientNested = {
  id: number;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
};

/** Site row when the quotation API expands `site`. */
export type QuotationSiteNested = {
  id: number;
  site_name: string;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
};

/** Contact row when the quotation API expands contact fields. */
export type QuotationContactNested = {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

/** Tag row when the quotation API expands `tags`. */
export type QuotationTagNested = {
  id: number;
  name?: string | null;
  tag_name?: string | null;
};

export type QuotationLevelRef = {
  id: number;
  name: string;
};

/** Composite / item payload on a drawing pin. */
export type QuotationPinItemDetail = {
  id?: number;
  name?: string | null;
  sku?: string | null;
  selling_price?: string | number | null;
  cost_price?: string | number | null;
  quantity?: number | null;
  components?: Array<{
    child_item_name?: string | null;
    quantity?: number | null;
  }>;
};

export type QuotationPlotPin = {
  id: number;
  quantity?: number | null;
  item_detail?: QuotationPinItemDetail | null;
  composite_item_name?: string;
  composite_name?: string;
  name?: string;
  price?: number | string | null;
  selling_price?: number | string | null;
  amount?: number | string | null;
};

/** Level list row returned by `GET project/:id/level/` (includes plots + pins). */
export type ProjectLevelForQuotation = {
  id: number;
  name: string;
  order?: number | null;
  plots?: Array<{
    id: number;
    name: string;
    pins?: QuotationPlotPin[];
  }>;
};

export type QuotationProjectRef = {
  id: number;
  name: string;
};

/** Line item sent with create/update quotation when the API supports structured scope. */
export type QuotationQuoteSectionLine = {
  line_order: number;
  composite_item_id: number | null;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type QuotationQuoteSectionPlot = {
  plot_order: number;
  plot_id: number | null;
  name: string;
  lines: QuotationQuoteSectionLine[];
  plot_total: number;
};

export type QuotationQuoteSection = {
  section_order: number;
  /** Project level (drawing) id when this section maps to the levels API; null for quote-only sections. */
  level_id: number | null;
  name: string;
  plots: QuotationQuoteSectionPlot[];
  section_total: number;
};

/** Nested site snapshot at submission time (denormalized from selected site). */
export type QuotationSiteSnapshot = {
  id: number;
  site_name: string;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  /** Site contact id at submission time (same source as form `site_contact`). */
  site_contact?: number | null;
};

export type QuotationCreatePayload = {
  customer: number;
  site: number;
  quote_name: string;
  primary_customer_contact?: number | null;
  additional_customer_contact?: number | null;
  tags: number[];
  order_number?: string | null;
  due_date?: string | null;
  salesperson?: number | null;
  project_manager?: number | null;
  technicians: number[];
  description?: string | null;
  project: number;
  levels: number[];
  select_all_levels: boolean;
  /** Optional: full section/plot/line ordering and totals for quotation scope. */
  quote_sections?: QuotationQuoteSection[];
  grand_total?: number | null;
  /** Nested snapshot of the selected site (address + `site_contact` at submission time). */
  site_snapshot?: QuotationSiteSnapshot | null;
};

export type QuotationListItem = {
  id: number;
  created_by: QuotationUserRef | null;
  modified_by: QuotationUserRef | null;
  created_at: string;
  modified_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
  customer: number | QuotationClientNested;
  site: number | QuotationSiteNested;
  cost_centre?: number | null;
  quote_name: string;
  primary_customer_contact: number | null | QuotationContactNested;
  additional_customer_contact: number | null | QuotationContactNested;
  site_contact: number | null | QuotationContactNested;
  tags?: Array<number | QuotationTagNested>;
  order_number: string | null;
  due_date: string | null;
  salesperson: string | number | QuotationUserRef | null;
  project_manager: string | number | QuotationUserRef | null;
  technicians?: number[] | QuotationUserRef[];
  /** Some API versions use singular `technician` for the same list. */
  technician?: number[] | QuotationUserRef[];
  description: string | null;
  project: QuotationProjectRef | number | null;
  /** Drawing / level ids; API may return `{ id, name }[]` or plain `number[]`. */
  levels?: Array<QuotationLevelRef | number>;
  select_all_levels: boolean;
  /** Quote workflow status; API may omit when not set. */
  status?: string | null;
  is_active: boolean;
  organization: number | null;
};

export type QuotationDetail = QuotationListItem & {
  salesperson?: number | string | QuotationUserRef | null;
  project_manager?: number | string | QuotationUserRef | null;
  /** When API echoes structured scope from create/update. */
  quote_sections?: QuotationQuoteSection[];
  grand_total?: number | null;
  site_snapshot?: QuotationSiteSnapshot | null;
};

export type QuotationPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type QuotationListResponse = {
  success: boolean;
  message: string;
  data: QuotationListItem[];
  pagination: QuotationPagination;
};

export type WorkspaceUserRow = {
  id: number;
  email: string;
  username: string;
};
