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

/** Fulfilment / shipping fields shared by items and composite items. */
const ITEM_FULFILMENT_FIELDS: FieldSpec[] = [
  { key: "length" },
  { key: "width" },
  { key: "height" },
  { key: "dimensions_unit" },
  { key: "weight" },
  { key: "weight_unit" },
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
    { key: "contact_type" },
    { key: "first_name", required: true },
    { key: "last_name", required: true },
    { key: "email", required: true },
    { key: "phone", required: true },
    { key: "client" },
    { key: "vendor" },
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
    { key: "project_status" },
    { key: "description" },
    { key: "sites" },
    { key: "manager_ids" },
    { key: "start_date" },
    { key: "end_date" },
    { key: "is_active" },
  ],
  items: [
    { key: "name", required: true },
    { key: "sku", required: true },
    { key: "item_type" },
    { key: "description" },
    { key: "quantity" },
    { key: "unit_type" },
    { key: "cost_price" },
    { key: "unit_cost" },
    { key: "default_markup" },
    { key: "selling_price" },
    { key: "unit_price" },
    { key: "vendor_ids" },
    { key: "reorder_quantity" },
    ...ITEM_FULFILMENT_FIELDS,
    { key: "is_active" },
  ],
  compositeItems: [
    { key: "name", required: true },
    { key: "sku", required: true },
    { key: "description" },
    { key: "quantity" },
    { key: "unit_type" },
    { key: "group" },
    { key: "installation_type" },
    { key: "installation_cost" },
    { key: "installation_cost_type" },
    { key: "installation_hours" },
    { key: "cost_price" },
    { key: "selling_price" },
    { key: "unit_price" },
    ...ITEM_FULFILMENT_FIELDS,
    { key: "is_active" },
  ],
  jobs: [
    { key: "title" },
    { key: "description" },
    { key: "job_category" },
    { key: "client" },
    { key: "project" },
    { key: "site" },
    { key: "job_status" },
    { key: "assigned_worker" },
    { key: "start_date" },
    { key: "forms" },
    { key: "checklists" },
  ],
  groups: [
    { key: "name", required: true },
    { key: "description" },
    { key: "is_active" },
  ],
  quotations: [
    { key: "quote_name", required: true },
    { key: "quote_category" },
    { key: "customer" },
    { key: "project" },
    { key: "site" },
    { key: "sites" },
    { key: "primary_contact" },
    { key: "primary_customer_contact" },
    { key: "salesperson" },
    { key: "project_manager" },
    { key: "technicians" },
    { key: "tags" },
    { key: "order_number" },
    { key: "due_date" },
    { key: "description" },
    { key: "status" },
  ],
  invoices: [
    { key: "invoice_number" },
    { key: "customer", required: true },
    { key: "client" },
    { key: "contact" },
    { key: "project" },
    { key: "status" },
    { key: "due_date" },
    { key: "payment_terms" },
    { key: "client_notes" },
    { key: "internal_notes" },
  ],
  purchaseOrders: [
    { key: "po_number" },
    { key: "vendor", required: true },
    { key: "project" },
    { key: "status" },
    { key: "order_date" },
    { key: "expected_delivery_date" },
    { key: "notes" },
  ],
  purchaseReceives: [
    { key: "receive_number" },
    { key: "purchase_order", required: true },
    { key: "vendor" },
    { key: "status" },
    { key: "receive_date" },
    { key: "notes" },
  ],
  materialRequests: [
    { key: "title", required: true },
    { key: "project" },
    { key: "status" },
    { key: "requested_by" },
    { key: "notes" },
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

/**
 * Prefer explicit segments when mass-export path differs from CRUD import path.
 * Composite items share the item import endpoint (`item/import/`), same as mass-actions.
 */
const IMPORT_API_SEGMENT_OVERRIDE: Partial<Record<MassActionResourceKey, string>> = {
  compositeItems: "item",
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
