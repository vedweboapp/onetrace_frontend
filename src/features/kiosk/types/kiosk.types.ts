export interface KioskField {
  _uid: string;
  id?: string | number;
  field_type: "selection_card" | string;
  field_label: string;
  label?: string;
  input_type: string;
  api_name: string;
  value: string;
  color: string;
  image?: string;
  required?: boolean;
  order?: number;
  description?: string;
  options?: Array<{
    _uid?: string;
    label: string;
    value: string;
    image?: string;
    color?: string;
  }>;
  [key: string]: any;
}

export interface KioskSection {
  _uid: string;
  id?: string | number;
  name: string;
  heading?: string;
  subheading?: string;
  column_count: number;
  sequence?: number;
  fields: KioskField[];
  is_deleted?: boolean;
}

export interface KioskSubmitConfig {
  heading: string;
  subheading: string;
  button_text: string;
  redirect_url?: string;
}

export interface KioskConfig {
  id?: string | number;
  name: string;
  api_name?: string;
  description?: string;
  sections: KioskSection[];
  submitting?: KioskSubmitConfig;
  is_active?: boolean;
  created_at?: string;
  modified_at?: string;
  created_by?: { id: number; username?: string; email?: string } | null;
  modified_by?: { id: number; username?: string; email?: string } | null;
}

export interface KioskListItem {
  id: string | number;
  name: string;
  api_name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  modified_at?: string;
  created_by?: { id: number; username?: string; email?: string } | null;
  modified_by?: { id: number; username?: string; email?: string } | null;
}

export const DEFAULT_KIOSK_CONFIG: KioskConfig = {
  name: "New Kiosk",
  api_name: "new_kiosk",
  description: "",
  sections: [],
  submitting: {
    heading: "Complete Check-In",
    subheading: "Please review and confirm to complete.",
    button_text: "Submit",
  },
};
