import type { CheckmarkSelectOption } from "@/shared/ui";

export type MassActionKind = "mass-update" | "mass-delete" | "mass-export";

export type MassExportFormat = "xlsx" | "csv";

export type MassUpdateFieldValueType = "text" | "number" | "select" | "textarea" | "date" | "datetime";

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
