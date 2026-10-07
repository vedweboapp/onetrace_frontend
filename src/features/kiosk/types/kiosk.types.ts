export type PlacementMode = "place";

export type LookupOptionType = "radio" | "checkbox" | "image_radio";

export interface PlacementPoint {
  x: number;
  y: number;
}

export interface PlacementCoordinates {
  top_left: PlacementPoint;
  bottom_right: PlacementPoint;
}

export interface PlacementConfig {
  mode: PlacementMode | null;
  coordinates?: PlacementCoordinates | null;
  target_field?: string | null; // UID of the selected kiosk image field to place on
  target_fields?: string[] | null; // UIDs of multiple selected image fields to place on
  target_question?: string | null; // UID of a whole question to place on
}

export interface ColorFillConfig {
  imageId: string; // the selected image to fill
  colorValue: string; // hex/rgba value from the colors field
}

export interface KioskOption {
  o_id?: string;
  uid?: string;
  _uid?: string;
  id?: string | number | null;
  sequence?: number;
  order?: number;
  label?: string | null;
  sub_label?: string | null;
  api_name?: string | null;
  value?: string | number | null;
  price?: number | string | null;
  image?: string | null;
  selected_image_field?: string | null;
  target_image_field?: string | null;
  /** UIDs of option(s) whose image should be color-filled when this color option is selected */
  fill_targets?: string[] | null;
  /** UID of a whole question — all image-bearing options in it become fill targets */
  fill_target_question?: string | null;
  placement_mode?: PlacementMode | null;
  placement?: PlacementConfig | null;
  placement_targets?: string[] | null;
  placement_target_question?: string | null;
  fill_color?: string | null;
  fill_image?: string | null;
  field_type?: "radio" | "checkbox" | "color" | "color_swatch" | "image_radio" | "input" | "items_lookup" | string | null;
  item_group_id?: string | number | null;
  lookup_option_type?: LookupOptionType | null;
  color?: string | null;
  api?: string | null;
  gid?: string | null;
  group_uid?: string | null;
  group_name?: string | null;
  input_type?: "text" | "number" | "email" | "tel" | "textarea" | string | null;
  placeholder?: string | null;
  required?: boolean;
  [key: string]: any;
}

export interface KioskGroup {
  gid: string;
  _uid?: string;
  id?: string | number | null;
  sequence?: number;
  order?: number;
  name: string;
  api_name?: string;
  description?: string;
  columns?: number;
  options: KioskOption[];
}

export interface KioskQuestion {
  q_id: string;
  _uid?: string;
  id?: string | number | null;
  sequence?: number;
  order?: number;
  label?: string | null;
  sub_label?: string | null;
  api_name?: string | null;
  is_lookup?: boolean;
  item_group_id?: string | number | null;
  lookup_option_type?: LookupOptionType | null;
  columns?: number;
  column_count?: number;
  options?: KioskOption[];
  groups?: KioskGroup[];
  is_deleted?: boolean;
  [key: string]: any;
}

export interface KioskSubmitConfig {
  heading?: string;
  subheading?: string;
  button_text?: string;
  redirect_url?: string;
}

export interface KioskConfig {
  id?: string | number;
  name: string;
  api_name?: string;
  description?: string;
  questions: KioskQuestion[];
  submitting?: KioskSubmitConfig;
  is_active?: boolean;
  created_at?: string;
  modified_at?: string;
  created_by?: { id: number; username?: string; email?: string } | null;
  modified_by?: { id: number; username?: string; email?: string } | null;
  [key: string]: any;
}

export interface KioskListItem {
  id: string | number;
  name: string;
  api_name: string;
  description?: string | null;
  is_active?: boolean;
  questions?: any[] | null;
  created_at?: string;
  modified_at?: string;
  created_by?: { id: number; username?: string; email?: string } | null;
  modified_by?: { id: number; username?: string; email?: string } | null;
}

export const DEFAULT_KIOSK_CONFIG: KioskConfig = {
  name: "New Kiosk",
  api_name: "new_kiosk",
  description: "",
  questions: [],
  submitting: {
    heading: "Complete",
    subheading: "Please review and confirm to complete.",
    button_text: "Submit",
  },
};

export interface CustomerOrderConfiguration {
  id: number;
  question_label?: string | null;
  question_api_name?: string | null;
  option_label?: string | null;
  option_value?: string | number | null;
  option_price?: string | number | null;
  [key: string]: unknown;
}

export interface CustomerOrderItem {
  id: number;
  item_name?: string | null;
  quantity?: number;
  unit_price?: string | number | null;
  total_price?: string | number | null;
  configurations?: CustomerOrderConfiguration[];
  snapshot_image_url?: string | null;
  [key: string]: unknown;
}

export interface CustomerOrderCustomer {
  id?: number;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  vat_registered?: boolean | null;
  vat_number?: string | null;
}

export interface CustomerOrder {
  id: number;
  order_number?: string | null;
  organization?: number;
  kiosk_machine?: number | null;
  customer?: CustomerOrderCustomer | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  order_status?: string | null;
  payment_status?: string | null;
  subtotal?: string | number | null;
  tax_amount?: string | number | null;
  shipping_amount?: string | number | null;
  total_amount?: string | number | null;
  transaction_id?: string | null;
  failure_reason?: string | null;
  invoice_url?: string | null;
  items?: CustomerOrderItem[];
  created_at?: string | null;
  modified_at?: string | null;
  [key: string]: unknown;
}

export interface CustomerOrderDetailItemValue {
  o_id?: number | string;
  id?: number | string;
  value?: string | number | null;
  label?: string | null;
  price?: number | string | null;
  [key: string]: unknown;
}

export interface CustomerOrderDetailItem {
  id?: number | string;
  q_id?: number | string;
  item_name?: string | null;
  question_title?: string | null;
  question_type?: string | null;
  quantity?: number;
  unit_price?: string | number | null;
  total_price?: string | number | null;
  configurations?: CustomerOrderConfiguration[];
  snapshot_image_url?: string | null;
  values?: CustomerOrderDetailItemValue[];
  [key: string]: unknown;
}

export interface CustomerOrderDetail {
  id: number;
  order_number?: string | null;
  organization?: number;
  kiosk_machine?: number | null;
  order_status?: string | null;
  payment_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  modified_at?: string | null;
  total_amount?: string | number | null;
  subtotal?: string | number | null;
  tax_amount?: string | number | null;
  vat_amount?: string | number | null;
  shipping_amount?: string | number | null;
  discount_amount?: string | number | null;
  transaction_id?: string | null;
  failure_reason?: string | null;
  invoice_url?: string | null;
  snapshot_image?: string | null;
  snapshot_image_url?: string | null;
  service_form?: { id: number; name?: string; title?: string } | number | null;
  kiosk?: { id: number; name?: string; title?: string } | number | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer?: CustomerOrderCustomer | null;
  billing_address?: {
    id?: number | string;
    address_line1?: string | null;
    address_line_1?: string | null;
    address_line2?: string | null;
    address_line_2?: string | null;
    city?: string | null;
    postcode?: string | null;
    country?: string | null;
  } | null;
  items?: CustomerOrderDetailItem[];
  [key: string]: unknown;
}

export * from "./kiosk-submission.types";
