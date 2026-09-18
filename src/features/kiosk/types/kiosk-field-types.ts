import { CircleDot, CheckSquare, Palette, Image, TextCursorInput, LucideIcon } from "lucide-react";
import type { KioskOption } from "./kiosk.types";

export interface KioskFieldConfigField {
  type: "text" | "number" | "textarea" | "select" | "color" | "image";
  label: string;
  key: keyof KioskOption;
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}

export interface KioskFieldTypeDefinition {
  label: string;
  field_type: "radio" | "checkbox" | "color" | "color_swatch" | "image_radio" | "input";
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
    description: "A selectable choice item with label, description, and optional price",
    defaultConfig: () => ({
      field_type: "radio",
      label: "Radio Choice",
      subLabel: "",
      api_name: "radio_choice",
      value: "radio_choice",
      price: "",
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
      api_name: "checkbox_choice",
      value: "checkbox_choice",
      price: "",
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
      api_name: "image_choice",
      value: "image_choice",
      price: "",
      image: "",
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
        label: "Price / Extra Fee",
        key: "price",
        placeholder: "e.g. 150.00",
        description: "Optional price or surcharge associated with this choice",
      },
    ],
  },
  input: {
    label: "Input Field",
    field_type: "input",
    icon: TextCursorInput,
    description: "An input field with custom attributes (label, placeholder, type, etc.) and individual answer values",
    defaultConfig: () => ({
      field_type: "input",
      label: "Input Field",
      subLabel: "",
      value: "",
      placeholder: "Enter value here...",
      input_type: "text",
      required: false,
      price: "",
      api_name: "input_field",
    }),
    configFields: [
      {
        type: "text",
        label: "Field Label",
        key: "label",
        placeholder: "e.g. Customer Name, Notes, or Phone",
        required: true,
      },
      {
        type: "textarea",
        label: "Sub Label / Helper Text",
        key: "subLabel",
        placeholder: "e.g. Please enter any specific preferences",
      },
      {
        type: "select",
        label: "Input Type",
        key: "input_type",
        options: [
          { label: "Text", value: "text" },
          { label: "Number", value: "number" },
          { label: "Email", value: "email" },
          { label: "Phone", value: "tel" },
          { label: "Textarea (Multi-line)", value: "textarea" },
        ],
        description: "Choose keyboard and format type for this input",
      },
      {
        type: "text",
        label: "Placeholder",
        key: "placeholder",
        placeholder: "e.g. Type your response...",
      },
      {
        type: "text",
        label: "Price / Extra Fee",
        key: "price",
        placeholder: "e.g. 0.00",
        description: "Optional surcharge added when this input field is filled",
      },
    ],
  },
};
