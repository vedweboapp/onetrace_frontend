import type { CheckmarkSelectOption } from "@/shared/ui";

export type MassActionKind = "mass-update" | "mass-delete" | "mass-export";

export type MassExportFormat = "xlsx" | "csv";

export type MassUpdateFieldValueType =
  | "text"
  | "name"
  | "title"
  | "email"
  | "number"
  | "phone"
  | "digits"
  | "select"
  | "textarea"
  | "date"
  | "datetime";

export type MassUpdateFieldValueFormat = "datetime-iso" | "date-iso";

export type MassUpdateFieldDef = {
  /** API `field_name` */
  name: string;
  label: string;
  valueType: MassUpdateFieldValueType;
  options?: CheckmarkSelectOption[];
  /** How to coerce `field_value` before sending */
  valueCoerce?: "string" | "number" | "boolean";
  /** Optional API serialization (e.g. ISO datetime from `datetime-local`) */
  valueFormat?: MassUpdateFieldValueFormat;
  /** Max length for text-like bulk-update inputs */
  maxLength?: number;
};

/** Top-level bulk action that maps to a single mass-update field (e.g. assign worker on jobs). */
export type MassDirectUpdateAction = {
  id: string;
  label: string;
  fieldName: string;
  options: CheckmarkSelectOption[];
  valueCoerce?: MassUpdateFieldDef["valueCoerce"];
};

export type MassActionPaths = {
  massUpdate: string;
  massDelete: string;
  massExport: string;
};

export type MassActionConfig = {
  /** Payload key for selected ids, e.g. `job_ids` */
  idsKey: string;
  paths: MassActionPaths;
  /** Suggested download filename stem for export (extension from response when possible) */
  exportFileName?: string;
};

export type MassIdsPayload = {
  [idsKey: string]: number[];
};

export type MassUpdatePayload = {
  field_name: string;
  field_value: string | number | boolean;
  [key: string]: string | number | boolean | number[];
};
