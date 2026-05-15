import {
  Minus,
  AlignLeft,
  Mail,
  Phone,
  List,
  ListChecks,
  Calendar,
  Clock,
  Hash,
  DollarSign,
  Circle,
  Percent,
  CheckSquare,
  Link,
  Search,
  Calculator,
  User,
  FileUp,
  Image,
  BarChart3,
  Home,
  ArrowUpDown,
  MapPin,
  Globe,
  LucideIcon,
} from "lucide-react";

export interface FieldConfig {
  type: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  defaultValue?: any;
  markAsPublic?: boolean;
  show_tooltip?: boolean;
  tool_tip?: string;
  rows?: number;
  unique?: boolean;
  options?: any[];
  max?: number;
  min?: number;
  prefix?: string;
  suffix?: string;
  startingNumber?: number;
  currency?: string;
  decimalPlaces?: number;
  defaultChecked?: boolean;
  lookup_module?: string;
  userType?: "single" | "multiple";
  maxFileSize?: number;
  allowedTypes?: string;
  summaryType?: string;
  relatedObject?: string;
}

export interface FieldTypeDefinition {
  label: string;
  icon: LucideIcon;
  defaultConfig: () => FieldConfig;
  configFields: any[];
}

export const FIELD_TYPES: Record<string, FieldTypeDefinition> = {
  text: {
    label: "Single Line",
    icon: Minus,
    defaultConfig: () => ({
      type: "text",
      label: "Single Line Text",
      name: "",
      placeholder: "",
      required: false,
      maxLength: 255,
      minLength: 0,
      defaultValue: "",
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "text", label: "Placeholder", key: "placeholder" },
      { type: "number", label: "Max Length", key: "maxLength" },
      { type: "number", label: "Min Length", key: "minLength" },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  "multi-line": {
    label: "Multi-Line",
    icon: AlignLeft,
    defaultConfig: () => ({
      type: "multi-line",
      label: "Description",
      name: "",
      placeholder: "Enter details...",
      required: false,
      rows: 4,
      maxLength: 5000,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "textarea", label: "Placeholder", key: "placeholder" },
      { type: "number", label: "Character limit", key: "maxLength" },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  email: {
    label: "Email",
    icon: Mail,
    defaultConfig: () => ({
      type: "email",
      label: "Email Address",
      name: "",
      placeholder: "john@example.com",
      unique: true,
      required: true,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "text", label: "Placeholder", key: "placeholder" },
      { type: "checkbox", label: "Is Unique", key: "is_unique" },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  phone: {
    label: "Phone",
    icon: Phone,
    defaultConfig: () => ({
      type: "phone",
      label: "Phone Number",
      name: "",
      placeholder: "+1 (555) 000-0000",
      required: false,
      maxLength: 12,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "text", label: "Placeholder", key: "placeholder" },
      { type: "number", label: "Max Length", key: "maxLength" },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  "pick-list": {
    label: "Pick List",
    icon: List,
    defaultConfig: () => ({
      type: "pick-list",
      label: "Status",
      name: "",
      options: ["Open", "In Progress", "Closed"],
      defaultValue: "Open",
      required: true,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      {
        type: "options",
        label: "Options (one per line)",
        key: "options",
        required: true,
      },
      { type: "text", label: "Default Value", key: "defaultValue" },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  "multi-select": {
    label: "Multi-Select",
    icon: ListChecks,
    defaultConfig: () => ({
      type: "multi-select",
      label: "Categories",
      name: "",
      options: ["Option 1", "Option 2", "Option 3"],
      required: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      {
        type: "options",
        label: "Options (one per line)",
        key: "options",
        required: true,
      },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  date: {
    label: "Date",
    icon: Calendar,
    defaultConfig: () => ({
      type: "date",
      label: "Date",
      name: "",
      required: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  "date-time": {
    label: "Date/Time",
    icon: Clock,
    defaultConfig: () => ({
      type: "date-time",
      label: "Date & Time",
      name: "",
      required: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  number: {
    label: "Number",
    icon: Hash,
    defaultConfig: () => ({
      type: "number",
      label: "Number",
      name: "",
      placeholder: "0",
      required: false,
      max: 9,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      {
        type: "drop-down",
        label: "Number of digits allowed",
        key: "max",
        options: [
          { value: 1, label: "1" }, { value: 2, label: "2" },
          { value: 3, label: "3" }, { value: 4, label: "4" },
          { value: 5, label: "5" }, { value: 6, label: "6" },
          { value: 7, label: "7" }, { value: 8, label: "8" },
          { value: 9, label: "9" },
        ],
      },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  "auto-number": {
    label: "Auto-Number",
    icon: ArrowUpDown,
    defaultConfig: () => ({
      type: "auto-number",
      label: "Auto Number",
      name: "",
      prefix: "",
      startingNumber: 1,
      suffix: "",
      required: false,
      unique: true,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "text", label: "Prefix", key: "prefix" },
      { type: "number", label: "Starting Number", key: "startingNumber" },
      { type: "text", label: "suffix", key: "suffix" },
      { type: "checkbox", label: "Is Unique", key: "unique", required: true },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  currency: {
    label: "Currency",
    icon: DollarSign,
    defaultConfig: () => ({
      type: "currency",
      label: "Amount",
      name: "",
      placeholder: "0.00",
      required: false,
      currency: "USD",
      max: 16,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "text", label: "Currency Code", key: "currency" },
      {
        type: "drop-down",
        label: "Maximum digits allowed",
        options: [
          { value: 1, label: "1" }, { value: 2, label: "2" },
          { value: 3, label: "3" }, { value: 4, label: "4" },
          { value: 5, label: "5" }, { value: 6, label: "6" },
          { value: 7, label: "7" }, { value: 8, label: "8" },
          { value: 9, label: "9" }, { value: 10, label: "10" },
          { value: 11, label: "11" }, { value: 12, label: "12" },
          { value: 13, label: "13" }, { value: 14, label: "14" },
          { value: 15, label: "15" }, { value: 16, label: "16" },
        ],
        key: "max",
      },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  decimal: {
    label: "Decimal",
    icon: Circle,
    defaultConfig: () => ({
      type: "decimal",
      label: "Decimal Number",
      name: "",
      placeholder: "0.00",
      required: false,
      decimalPlaces: 2,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      {
        type: "drop-down",
        label: "Maximum digits allowed",
        options: [
          { value: 1, label: "1" }, { value: 2, label: "2" },
          { value: 3, label: "3" }, { value: 4, label: "4" },
          { value: 5, label: "5" }, { value: 6, label: "6" },
          { value: 7, label: "7" }, { value: 8, label: "8" },
          { value: 9, label: "9" }, { value: 10, label: "10" },
          { value: 11, label: "11" }, { value: 12, label: "12" },
          { value: 13, label: "13" }, { value: 14, label: "14" },
          { value: 15, label: "15" }, { value: 16, label: "16" },
        ],
        key: "max",
      },
      {
        type: "drop-down",
        label: "Decimal Places",
        options: [
          { value: 1, label: "1" }, { value: 2, label: "2" },
          { value: 3, label: "3" }, { value: 4, label: "4" },
          { value: 5, label: "5" }, { value: 6, label: "6" },
          { value: 7, label: "7" }, { value: 8, label: "8" },
          { value: 9, label: "9" },
        ],
        key: "decimalPlaces",
      },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  percent: {
    label: "Percent",
    icon: Percent,
    defaultConfig: () => ({
      type: "percent",
      label: "Percentage",
      name: "",
      placeholder: "0",
      required: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "text", label: "Placeholder", key: "placeholder" },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  "long-integer": {
    label: "Long Integer",
    icon: MapPin,
    defaultConfig: () => ({
      type: "long-integer",
      label: "Long Integer",
      name: "",
      placeholder: "0",
      required: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      {
        type: "drop-down",
        label: "Maximum digits allowed",
        options: [
          { value: 1, label: "1" }, { value: 2, label: "2" },
          { value: 3, label: "3" }, { value: 4, label: "4" },
          { value: 5, label: "5" }, { value: 6, label: "6" },
          { value: 7, label: "7" }, { value: 8, label: "8" },
          { value: 9, label: "9" }, { value: 10, label: "10" },
          { value: 11, label: "11" }, { value: 12, label: "12" },
          { value: 13, label: "13" }, { value: 14, label: "14" },
          { value: 15, label: "15" }, { value: 16, label: "16" },
        ],
        key: "max",
      },
      { type: "checkbox", label: "Is Unique", key: "is_unique" },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  checkbox: {
    label: "Checkbox",
    icon: CheckSquare,
    defaultConfig: () => ({
      type: "checkbox",
      label: "Status",
      name: "",
      required: false,
      defaultChecked: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Checked by Default", key: "defaultChecked" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  url: {
    label: "URL",
    icon: Link,
    defaultConfig: () => ({
      type: "url",
      label: "Website",
      name: "",
      placeholder: "https://example.com",
      required: false,
      max: 255,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "number", label: "Number of characters allowed", key: "max" },
      { type: "text", label: "Placeholder", key: "placeholder" },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  lookup: {
    label: "Lookup",
    icon: Search,
    defaultConfig: () => ({
      type: "lookup",
      label: "Related Record",
      name: "",
      lookup_module: "lead",
      required: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      {
        type: "drop-down",
        label: "Lookup Module",
        key: "lookup_module",
        required: true,
        options: [
          { value: "deal", label: "Deals" },
          { value: "lead", label: "Leads" },
          { value: "contact", label: "Contacts" },
          { value: "account", label: "Accounts" },
          { value: "pipeline", label: "Pipelines" },
          { value: "stage", label: "Stages" },
        ],
      },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  user: {
    label: "User",
    icon: User,
    defaultConfig: () => ({
      type: "user",
      label: "Assigned To",
      name: "",
      userType: "single",
      required: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      {
        type: "radio-group",
        label: "Type",
        key: "userType",
        options: [
          { value: "single", label: "Single User" },
          { value: "multiple", label: "Multiple Users" },
        ],
      },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  "file-upload": {
    label: "File Upload",
    icon: FileUp,
    defaultConfig: () => ({
      type: "file-upload",
      label: "Attachments",
      name: "",
      maxFileSize: 5,
      allowedTypes: "*",
      required: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "number", label: "Max File Size (MB)", key: "maxFileSize" },
      { type: "text", label: "Allowed File Types", key: "allowedTypes" },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  "image-upload": {
    label: "Image Upload",
    icon: Image,
    defaultConfig: () => ({
      type: "image-upload",
      label: "Image",
      name: "",
      maxFileSize: 5,
      required: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "number", label: "Max File Size (MB)", key: "maxFileSize" },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  "rollup-summary": {
    label: "Rollup Summary",
    icon: BarChart3,
    defaultConfig: () => ({
      type: "rollup-summary",
      label: "Total count",
      name: "",
      summaryType: "SUM",
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "text", label: "Related Object", key: "relatedObject" },
      { type: "text", label: "Summary Type (SUM/COUNT/AVG)", key: "summaryType" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  country: {
    label: "Country",
    icon: Globe,
    defaultConfig: () => ({
      type: "country",
      label: "Country",
      name: "",
      required: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  "multi-select-lookup": {
    label: "Multi-Select Lookup",
    icon: ListChecks,
    defaultConfig: () => ({
      type: "multi-select-lookup",
      label: "Related Records",
      name: "",
      lookup_module: "deal",
      required: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      {
        type: "drop-down",
        label: "Lookup Module",
        key: "lookup_module",
        required: true,
        options: [
          { value: "deal", label: "Deals" },
          { value: "lead", label: "Leads" },
          { value: "contact", label: "Contacts" },
          { value: "account", label: "Accounts" },
          { value: "pipeline", label: "Pipelines" },
          { value: "stage", label: "Stages" },
        ],
      },
      { type: "checkbox", label: "Required", key: "required" },
      { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  "receiver-lookup": {
    label: "Receiver Lookup",
    icon: Home,
    defaultConfig: () => ({
      type: "receiver-lookup",
      label: "Receiver Record",
      name: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      {
        type: "drop-down", label: "Lookup Module", key: "lookup_module", required: true, options: [
          { value: "", label: "Select Module" },
          { value: "deal", label: "Deals" },
          { value: "contact", label: "Contacts" },
          { value: "account", label: "Accounts" },
          { value: "pipeline", label: "Pipelines" },
          { value: "stage", label: "Stages" },
        ]
      },
      { type: "text", label: "Parent Field", key: "parent_field", required: true },
      { type: "text", label: "Search for", key: "search_for", required: true },
    ]
  }
};

const aliases: Record<string, string> = {
  "pick_list": "pick-list",
  "multi_line": "multi-line",
  "multi_text": "multi-line",
  "multi-text": "multi-line",
  "multi_select": "multi-select",
  "date_time": "date-time",
  "auto_number": "auto-number",
  "file_upload": "file-upload",
  "rollup_summary": "rollup-summary",
  "multi_select_lookup": "multi-select-lookup",
  "image_uploader": "image-upload",
  "image_upload": "image-upload",
};

Object.keys(aliases).forEach(backendType => {
  const frontendType = aliases[backendType];
  if (FIELD_TYPES[frontendType]) {
    FIELD_TYPES[backendType] = {
      ...FIELD_TYPES[frontendType],
      defaultConfig: () => ({
        ...FIELD_TYPES[frontendType].defaultConfig(),
        type: backendType,
      })
    };
  }
});