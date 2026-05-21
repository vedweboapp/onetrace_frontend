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
  PenTool,
} from "lucide-react";
import { currencyList } from "./currency-list";

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
  // lookup_module?: string;
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
  single_line: {
    label: "Single Line",
    icon: Minus,
    defaultConfig: () => ({
      type: "single_line",
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  multi_line: {
    label: "Multi-Line",
    icon: AlignLeft,
    defaultConfig: () => ({
      type: "multi_line",
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  picklist: {
    label: "Pick List",
    icon: List,
    defaultConfig: () => ({
      type: "picklist",
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  multi_select: {
    label: "Multi-Select",
    icon: ListChecks,
    defaultConfig: () => ({
      type: "multi_select",
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  datetime: {
    label: "Date/Time",
    icon: Clock,
    defaultConfig: () => ({
      type: "datetime",
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  // auto_number: {
  //   label: "Auto-Number",
  //   icon: ArrowUpDown,
  //   defaultConfig: () => ({
  //     type: "auto_number",
  //     label: "Auto Number",
  //     name: "",
  //     prefix: "",
  //     startingNumber: 1,
  //     suffix: "",
  //     required: false,
  //     unique: true,
  //     markAsPublic: false,
  //     show_tooltip: false,
  //     tool_tip: "",
  //   }),
  //   configFields: [
  //     { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
  //     { type: "text", label: "Prefix", key: "prefix" },
  //     { type: "number", label: "Starting Number", key: "startingNumber" },
  //     { type: "text", label: "suffix", key: "suffix" },
  //     { type: "checkbox", label: "Is Unique", key: "unique", required: true },
  //     // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
  //     // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
  //   ],
  // },
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
      {
        type: "drop-down",
        label: "Currency Code",
        key: "currency",
        options: currencyList.map((c) => ({
          value: c.value,
          label: `${c.label} - ${c.value}`,
        })),
      },
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  // long_integer: {
  //   label: "Long Integer",
  //   icon: MapPin,
  //   defaultConfig: () => ({
  //     type: "long_integer",
  //     label: "Long Integer",
  //     name: "",
  //     placeholder: "0",
  //     required: false,
  //     markAsPublic: false,
  //     show_tooltip: false,
  //     tool_tip: "",
  //   }),
  //   configFields: [
  //     { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
  //     {
  //       type: "drop-down",
  //       label: "Maximum digits allowed",
  //       options: [
  //         { value: 1, label: "1" }, { value: 2, label: "2" },
  //         { value: 3, label: "3" }, { value: 4, label: "4" },
  //         { value: 5, label: "5" }, { value: 6, label: "6" },
  //         { value: 7, label: "7" }, { value: 8, label: "8" },
  //         { value: 9, label: "9" }, { value: 10, label: "10" },
  //         { value: 11, label: "11" }, { value: 12, label: "12" },
  //         { value: 13, label: "13" }, { value: 14, label: "14" },
  //         { value: 15, label: "15" }, { value: 16, label: "16" },
  //       ],
  //       key: "max",
  //     },
  //     { type: "checkbox", label: "Is Unique", key: "is_unique" },
  //     { type: "checkbox", label: "Required", key: "required" },
  //     // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
  //     // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
  //   ],
  // },
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  // lookup: {
  //   label: "Lookup",
  //   icon: Search,
  //   defaultConfig: () => ({
  //     type: "lookup",
  //     label: "Related Record",
  //     name: "",
  //     lookup_module: "lead",
  //     required: false,
  //     markAsPublic: false,
  //     show_tooltip: false,
  //     tool_tip: "",
  //   }),
  //   configFields: [
  //     { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
  //     {
  //       type: "drop-down",
  //       label: "Lookup Module",
  //       key: "lookup_module",
  //       required: true,
  //       options: [
  //         { value: "deal", label: "Deals" },
  //         { value: "lead", label: "Leads" },
  //         { value: "contact", label: "Contacts" },
  //         { value: "account", label: "Accounts" },
  //         { value: "pipeline", label: "Pipelines" },
  //         { value: "stage", label: "Stages" },
  //       ],
  //     },
  //     { type: "checkbox", label: "Required", key: "required" },
  //     // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
  //     // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
  //   ],
  // },
  // user: {
  //   label: "User",
  //   icon: User,
  //   defaultConfig: () => ({
  //     type: "user",
  //     label: "Assigned To",
  //     name: "",
  //     userType: "single",
  //     required: false,
  //     markAsPublic: false,
  //     show_tooltip: false,
  //     tool_tip: "",
  //   }),
  //   configFields: [
  //     { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
  //     {
  //       type: "radio-group",
  //       label: "Type",
  //       key: "userType",
  //       options: [
  //         { value: "single", label: "Single User" },
  //         { value: "multiple", label: "Multiple Users" },
  //       ],
  //     },
  //     // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
  //     // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
  //   ],
  // },
  file_upload: {
    label: "File Upload",
    icon: FileUp,
    defaultConfig: () => ({
      type: "file_upload",
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
      { type: "drop-down", label: "Allowed File Types", key: "allowedTypes", options: 
        [
           { value: "*", label: "All Files" }
        , { value: "image/*", label: "Images" }
        , { value: "application/pdf", label: "PDFs" }
        , { value: "application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word Documents" }
        , { value: "application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel Spreadsheets" }
        , { value: "text/csv", label: "CSV Files" }
        ]
       },
      { type: "checkbox", label: "Required", key: "required" },
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  image_upload: {
    label: "Image Upload",
    icon: Image,
    defaultConfig: () => ({
      type: "image_upload",
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  rollup_summary: {
    label: "Rollup Summary",
    icon: BarChart3,
    defaultConfig: () => ({
      type: "rollup_summary",
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  state: {
    label: "State",
    icon: Globe,
    defaultConfig: () => ({
      type: "state",
      label: "State",
      name: "",
      required: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "checkbox", label: "Required", key: "required" },
    ],
  },
  city: {
    label: "City",
    icon: Globe,
    defaultConfig: () => ({
      type: "city",
      label: "City",
      name: "",
      required: false,
      markAsPublic: false,
      show_tooltip: false,
      tool_tip: "",
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "checkbox", label: "Required", key: "required" },
    ],
  },
  multi_select_lookup: {
    label: "Multi-Select Lookup",
    icon: ListChecks,
    defaultConfig: () => ({
      type: "multi_select_lookup",
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
      // { type: "checkbox", label: "Mark as Public", key: "markAsPublic", showInfoIcon: true },
      // { type: "tooltip-panel", label: "Show Tooltip", key: "show_tooltip" },
    ],
  },
  receiver_lookup: {
    label: "Receiver Lookup",
    icon: Home,
    defaultConfig: () => ({
      type: "receiver_lookup",
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
  },
  signature: {
    label: "Signature",
    icon: PenTool,
    defaultConfig: () => ({
      type: "signature",
      label: "Signature",
      name: "",
      required: false,
      placeholder: "Sign here...",
      height: 200,
    }),
    configFields: [
      { type: "text", label: "Field Label", key: "label", required: true, maxLength: 20 },
      { type: "text", label: "Placeholder", key: "placeholder" },
      { type: "number", label: "Canvas Height (px)", key: "height" },
      { type: "checkbox", label: "Required", key: "required" },
    ],
  }
};

// No aliases or backward compatibility mappings needed for new development
