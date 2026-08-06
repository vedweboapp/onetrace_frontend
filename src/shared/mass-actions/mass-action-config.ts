import type { MassActionConfig } from "./types";

export type MassActionResourceKey =
  | "jobs"
  | "clients"
  | "contacts"
  | "sites"
  | "quotations"
  | "groups"
  | "materialRequests"
  | "items"
  | "compositeItems"
  | "projects"
  | "invoices"
  | "purchaseOrders"
  | "qrCodes";

const RESOURCE_META: Record<MassActionResourceKey, { idsKey: string; apiSegment: string }> = {
  jobs: { idsKey: "job_ids", apiSegment: "jobs" },
  clients: { idsKey: "client_ids", apiSegment: "clients" },
  contacts: { idsKey: "contact_ids", apiSegment: "contacts" },
  sites: { idsKey: "site_ids", apiSegment: "sites" },
  quotations: { idsKey: "quotation_ids", apiSegment: "quotations" },
  groups: { idsKey: "group_ids", apiSegment: "group" },
  materialRequests: { idsKey: "material_request_ids", apiSegment: "material-requests" },
  items: { idsKey: "item_ids", apiSegment: "item" },
  compositeItems: { idsKey: "item_ids", apiSegment: "item" },
  projects: { idsKey: "project_ids", apiSegment: "project" },
  invoices: { idsKey: "invoice_ids", apiSegment: "invoice" },
  purchaseOrders: { idsKey: "purchase_order_ids", apiSegment: "purchase-orders" },
  qrCodes: { idsKey: "qr_code_ids", apiSegment: "qr-codes" },
};

export function massActionConfigFor(resource: MassActionResourceKey): MassActionConfig {
  const { idsKey, apiSegment } = RESOURCE_META[resource];
  return {
    idsKey,
    exportFileName: `${apiSegment}-export`,
    paths: {
      massUpdate: `${apiSegment}/mass-update/`,
      massDelete: `${apiSegment}/mass-delete/`,
      massExport: `${apiSegment}/mass-export/`,
    },
  };
}
