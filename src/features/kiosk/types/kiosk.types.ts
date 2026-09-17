export type PlacementMode = "place" | "group";

export type PositionValue = "top" | "bottom" | "left" | "right" | "center";

export interface PlacementConfig {
  mode: PlacementMode;
  position?: PositionValue; // only relevant when mode === 'place'
  target_field?: string | null; // UID of the selected kiosk image field to place on
}

export interface KioskOption {
  _uid: string;
  id?: string | number | null;
  label?: string | null;
  subLabel?: string | null;
  api_name?: string | null;
  value?: string | number | null;
  price?: number | string | null;
  image?: string | null;
  selected_image_field?: string | null;
  target_image_field?: string | null;
  placement_mode?: PlacementMode | null;
  placement_position?: PositionValue | null;
  placement?: PlacementConfig | null;
  field_type?: "radio" | "checkbox" | "color" | "color_swatch" | "image_radio" | string | null;
  color?: string | null;
  api?: string | null;
  [key: string]: any;
}

export interface KioskQuestion {
  _uid: string;
  id?: string | number | null;
  label?: string | null;
  subLabel?: string | null;
  api_name?: string | null;
  columns?: number;
  column_count?: number;
  options: KioskOption[];
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
