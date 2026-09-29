import { AUDIT_TRAIL_MODULES } from "@/features/audit-trails/constants/audit-trail-modules";
import type { AuditTrailEntry } from "@/features/audit-trails/types/audit-trail.types";
import { auditTrailObjectId, auditTrailPrimaryText } from "@/features/audit-trails/utils/audit-trail-display.util";
import { routes } from "@/shared/config/routes";

/** Best-effort detail href for an audit row's resource. */
export function auditTrailResourceHref(row: AuditTrailEntry): string | null {
  const objectId = auditTrailObjectId(row);
  if (objectId == null) return null;

  const module = (row.module ?? row.model_name ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");

  switch (module) {
    case AUDIT_TRAIL_MODULES.materialRequest:
    case "materialrequests":
      return `${routes.dashboard.materialRequests}/${objectId}`;
    case AUDIT_TRAIL_MODULES.quotation:
    case "quotations":
      return `${routes.dashboard.quotations}/${objectId}`;
    case AUDIT_TRAIL_MODULES.client:
    case "clients":
      return `${routes.dashboard.clients}/${objectId}`;
    case AUDIT_TRAIL_MODULES.vendor:
    case "vendors":
      return `${routes.dashboard.vendors}/${objectId}`;
    case AUDIT_TRAIL_MODULES.contact:
    case "contact":
    case "contacts":
      return `${routes.dashboard.contacts}/${objectId}`;
    case AUDIT_TRAIL_MODULES.job:
    case "jobs":
      return `${routes.dashboard.jobs}/${objectId}`;
    case AUDIT_TRAIL_MODULES.project:
    case "projects":
      return `${routes.dashboard.projects}/${objectId}`;
    case AUDIT_TRAIL_MODULES.site:
    case "sites":
      return `${routes.dashboard.sites}/${objectId}`;
    case AUDIT_TRAIL_MODULES.dispatch:
    case "dispatches":
      return `${routes.dashboard.dispatches}/${objectId}`;
    case AUDIT_TRAIL_MODULES.invoice:
    case "invoices":
      return `${routes.dashboard.invoices}/${objectId}`;
    case AUDIT_TRAIL_MODULES.purchaseOrder:
    case "purchaseorders":
      return `${routes.dashboard.purchaseOrders}/${objectId}`;
    case AUDIT_TRAIL_MODULES.item:
    case "items":
      return `${routes.dashboard.items}/${objectId}`;
    case AUDIT_TRAIL_MODULES.group:
    case "groups":
      return `${routes.dashboard.groups}/${objectId}`;
    case AUDIT_TRAIL_MODULES.compositeItem:
    case "compositeitems":
      return `${routes.dashboard.compositeItems}/${objectId}`;
    case AUDIT_TRAIL_MODULES.jobSchedule:
      return routes.dashboard.scheduling;
    case AUDIT_TRAIL_MODULES.workerTimeOff:
      return routes.dashboard.scheduling;
    default:
      return null;
  }
}

export function auditTrailResourceLabel(row: AuditTrailEntry): string {
  const primary = auditTrailPrimaryText(row);
  if (primary) return primary;
  const objectId = auditTrailObjectId(row);
  const module = row.module?.trim() || row.model_name?.trim() || "Record";
  if (objectId != null) return `${module} #${objectId}`;
  return module;
}
