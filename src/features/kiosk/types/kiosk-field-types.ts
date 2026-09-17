import { CircleDot, CheckSquare, Palette, Image, LucideIcon } from "lucide-react";
import type { KioskOption } from "./kiosk.types";

export interface KioskFieldConfigField {
  type: "text" | "number" | "textarea" | "select" | "color" | "image";
  label: string;
  key: keyof KioskOption;
  placeholder?: string;
  description?: string;
  required?: boolean;
}

export interface KioskFieldTypeDefinition {
  label: string;
  field_type: "radio" | "checkbox" | "color" | "color_swatch" | "image_radio";
  icon: LucideIcon;
  description: string;
  defaultConfig: () => Partial<KioskOption>;
  configFields: KioskFieldConfigField[];
}

export const KIOSK_FIELD_TYPES: Record<string, KioskFieldTypeDefinition> = {
  radio: {
    label: "Radio Option",
    field_type: "radio",
    icon: CircleDot,
    description: "A selectable choice item with label, description, value, and optional price",
    defaultConfig: () => ({
      field_type: "radio",
      label: "Radio Choice",
      subLabel: "",
      value: "choice_1",
      price: "",
      api_name: "radio_choice",
    }),
    configFields: [
      {
        type: "text",
        label: "Option Label",
        key: "label",
        placeholder: "e.g. Standard Check-In",
        required: true,
      },
      {
        type: "textarea",
        label: "Sub Label / Description",
        key: "subLabel",
        placeholder: "e.g. Description or notes for this choice",
      },
      {
        type: "text",
        label: "Value / Code",
        key: "value",
        placeholder: "e.g. standard_checkin",
        required: true,
      },
      {
        type: "text",
        label: "Price / Extra Fee",
        key: "price",
        placeholder: "e.g. 25.00",
        description: "Optional price or surcharge associated with this choice",
      },
    ],
  },
  checkbox: {
    label: "Checkbox Option",
    field_type: "checkbox",
    icon: CheckSquare,
    description: "A toggleable checkbox item — multiple options can be selected at once",
    defaultConfig: () => ({
      field_type: "checkbox",
      label: "Checkbox Choice",
      subLabel: "",
      value: "choice_1",
      price: "",
      api_name: "checkbox_choice",
    }),
    configFields: [
      {
        type: "text",
        label: "Option Label",
        key: "label",
        placeholder: "e.g. Add Extra Towels",
        required: true,
      },
      {
        type: "textarea",
        label: "Sub Label / Description",
        key: "subLabel",
        placeholder: "e.g. Additional notes for this option",
      },
      {
        type: "text",
        label: "Value / Code",
        key: "value",
        placeholder: "e.g. extra_towels",
        required: true,
      },
      {
        type: "text",
        label: "Price / Extra Fee",
        key: "price",
        placeholder: "e.g. 5.00",
        description: "Optional price or surcharge associated with this option",
      },
    ],
  },
  color: {
    label: "Color Option",
    field_type: "color",
    icon: Palette,
    description: "A color choice item with a color swatch indicator — acts as a single-select option",
    defaultConfig: () => ({
      field_type: "color",
      label: "Color Choice",
      subLabel: "",
      color: "#2563EB",
      value: "#2563EB",
      target_image_field: undefined,
      fill_image: undefined,
      color_fill: null,
      price: "",
      api_name: "color_choice",
    }),
    configFields: [
      {
        type: "color",
        label: "Color Swatch",
        key: "color",
        placeholder: "#2563EB",
        description: "Choose the swatch color — the option value will be based on it",
        required: true,
      },
      {
        type: "image",
        label: "Fill Image (SVG / PNG to Color)",
        key: "fill_image",
        placeholder: "",
        description: "Upload an image (SVG, PNG, JPG, WebP) to fill/tint with this color",
      },
      {
        type: "text",
        label: "Option Label",
        key: "label",
        placeholder: "e.g. Royal Blue",
        required: true,
      },
      {
        type: "textarea",
        label: "Sub Label / Description",
        key: "subLabel",
        placeholder: "e.g. Glossy metallic finish",
      },
      {
        type: "text",
        label: "Value / Code",
        key: "value",
        placeholder: "e.g. #2563EB",
        description: "Stored value (automatically updated when you pick a color)",
        required: true,
      },
      {
        type: "text",
        label: "Price / Extra Fee",
        key: "price",
        placeholder: "e.g. 10.00",
        description: "Optional price or surcharge for this color choice",
      },
    ],
  },
  color_swatch: {
    label: "Color Swatch Option",
    field_type: "color_swatch",
    icon: Palette,
    description: "A color swatch option with a color swatch indicator — acts as a single-select choice",
    defaultConfig: () => ({
      field_type: "color_swatch",
      label: "Color Swatch Choice",
      subLabel: "",
      color: "#0EA5E9",
      value: "#0EA5E9",
      target_image_field: undefined,
      fill_image: undefined,
      color_fill: null,
      price: "",
      api_name: "color_swatch_choice",
    }),
    configFields: [
      {
        type: "color",
        label: "Color Swatch",
        key: "color",
        placeholder: "#0EA5E9",
        description: "Choose the swatch color — the option value will be based on it",
        required: true,
      },
      {
        type: "image",
        label: "Fill Image (SVG / PNG to Color)",
        key: "fill_image",
        placeholder: "",
        description: "Upload an image (SVG, PNG, JPG, WebP) to fill/tint with this color",
      },
      {
        type: "text",
        label: "Option Label",
        key: "label",
        placeholder: "e.g. Sky Blue",
        required: true,
      },
      {
        type: "textarea",
        label: "Sub Label / Description",
        key: "subLabel",
        placeholder: "e.g. Glossy sky blue finish",
      },
      {
        type: "text",
        label: "Value / Code",
        key: "value",
        placeholder: "e.g. #0EA5E9",
        description: "Stored value (automatically updated when you pick a color)",
        required: true,
      },
      {
        type: "text",
        label: "Price / Extra Fee",
        key: "price",
        placeholder: "e.g. 10.00",
        description: "Optional price or surcharge for this color choice",
      },
    ],
  },
  image_radio: {
    label: "Image Radio Option",
    field_type: "image_radio",
    icon: Image,
    description: "A radio option with placement controls and built-in image positioning",
    defaultConfig: () => ({
      field_type: "image_radio",
      label: "Image Choice",
      subLabel: "",
      value: "image_choice",
      price: "",
      image: "",
      placement_mode: "group",
      placement_position: undefined,
      placement: {
        mode: "group",
      },
      api_name: "image_choice",
    }),
    configFields: [
      {
        type: "image",
        label: "Object image",
        key: "image",
        placeholder: "",
        description: "Upload an image to display on the option card",
      },
      {
        type: "text",
        label: "Option Label",
        key: "label",
        placeholder: "e.g. Premium Suite",
        required: true,
      },
      {
        type: "textarea",
        label: "Sub Label / Description",
        key: "subLabel",
        placeholder: "e.g. Spacious suite with ocean view",
      },
      {
        type: "text",
        label: "Value / Code",
        key: "value",
        placeholder: "e.g. premium_suite",
        required: true,
      },
      {
        type: "text",
        label: "Price / Extra Fee",
        key: "price",
        placeholder: "e.g. 150.00",
        description: "Optional price or surcharge associated with this choice",
      },
    ],
  },
};
