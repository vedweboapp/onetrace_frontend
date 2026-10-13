import type { MassActionResourceKey } from "@/shared/mass-actions/mass-action-config";
import { massActionConfigFor } from "@/shared/mass-actions/mass-action-config";
import type { ImportFieldDef, ModuleImportConfig } from "./types";

type FieldSpec = { key: string; required?: boolean };

const ADDRESS_FIELDS: FieldSpec[] = [
  { key: "address_line_1" },
  { key: "address_line_2" },
  { key: "country" },
  { key: "state" },
  { key: "city" },
  { key: "pincode" },
];

/** Importable fields per mass-action resource (API `module_field` keys). */
export const IMPORT_FIELD_SPECS: Partial<Record<MassActionResourceKey, FieldSpec[]>> = {
  clients: [
    { key: "name", required: true },
    { key: "email", required: true },
    { key: "phone", required: true },
    ...ADDRESS_FIELDS,
    { key: "is_active" },
  ],
  vendors: [
    { key: "name", required: true },
    { key: "email", required: true },
    { key: "phone", required: true },
    { key: "vendor_types" },
    ...ADDRESS_FIELDS,
    { key: "is_active" },
  ],
  contacts: [
    { key: "first_name", required: true },
    { key: "last_name", required: true },
    { key: "email", required: true },
    { key: "phone", required: true },
    { key: "client" },
    ...ADDRESS_FIELDS,
    { key: "is_active" },
  ],
  sites: [
    { key: "site_name", required: true },
    { key: "client", required: true },
    ...ADDRESS_FIELDS,
    { key: "what3words" },
    { key: "latitude" },
    { key: "longitude" },
  ],
  projects: [
    { key: "name", required: true },
    { key: "client", required: true },
    { key: "project_type" },
    { key: "description" },
    { key: "start_date" },
    { key: "end_date" },
    { key: "is_active" },
  ],
  items: [
    { key: "name", required: true },
    { key: "sku" },
    { key: "description" },
    { key: "unit_type" },
    { key: "unit_cost" },
    { key: "unit_price" },
    { key: "is_active" },
  ],
  compositeItems: [
    { key: "name", required: true },
    { key: "sku" },
    { key: "description" },
    { key: "unit_price" },
    { key: "is_active" },
  ],
  jobs: [
    { key: "title", required: true },
    { key: "description" },
    { key: "client" },
    { key: "project" },
    { key: "site" },
    { key: "job_status" },
    { key: "start_date" },
  ],
  groups: [
    { key: "name", required: true },
    { key: "description" },
    { key: "is_active" },
  ],
  quotations: [
    { key: "quote_name", required: true },
    { key: "customer" },
    { key: "site" },
    { key: "primary_contact" },
    { key: "status" },
  ],
  invoices: [
    { key: "invoice_number" },
    { key: "customer", required: true },
    { key: "status" },
    { key: "due_date" },
  ],
  purchaseOrders: [
    { key: "po_number" },
    { key: "vendor", required: true },
    { key: "project" },
    { key: "status" },
  ],
  purchaseReceives: [
    { key: "receive_number" },
    { key: "purchase_order", required: true },
    { key: "vendor" },
    { key: "status" },
  ],
  materialRequests: [
    { key: "title", required: true },
    { key: "project" },
    { key: "status" },
  ],
  qrCodes: [
    { key: "name", required: true },
    { key: "code" },
    { key: "is_active" },
  ],
};

export type ImportFieldLabelLookup = (key: string) => string;

export function buildImportFields(
  specs: FieldSpec[],
  labelFor: ImportFieldLabelLookup,
): ImportFieldDef[] {
  return specs.map((s) => ({
    key: s.key,
    label: labelFor(s.key),
    required: s.required,
  }));
}

/** Prefer explicit segments when mass-export path differs from CRUD import path. */
const IMPORT_API_SEGMENT_OVERRIDE: Partial<Record<MassActionResourceKey, string>> = {
  compositeItems: "composite-item",
};

export function buildModuleImportConfig(
  resource: MassActionResourceKey,
  moduleLabel: string,
  labelFor: ImportFieldLabelLookup,
): ModuleImportConfig | null {
  const specs = IMPORT_FIELD_SPECS[resource];
  if (!specs?.length) return null;
  const override = IMPORT_API_SEGMENT_OVERRIDE[resource];
  const { paths } = massActionConfigFor(resource);
  // paths.massExport is like `clients/mass-export/` → segment before first slash
  const apiSegment = override ?? paths.massExport.split("/")[0] ?? resource;
  return {
    apiSegment,
    moduleLabel,
    fields: buildImportFields(specs, labelFor),
  };
}
