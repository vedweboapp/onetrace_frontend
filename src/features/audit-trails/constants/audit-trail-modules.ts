/** Backend `module` query values for GET audit-trails. */
export const AUDIT_TRAIL_MODULES = {
  materialRequest: "materialrequest",
  quotation: "quotation",
  client: "client",
  vendor: "vendor",
  quotationTag: "quotationtag",
  contact: "contactmodel",
  job: "job",
  project: "project",
  jobSchedule: "jobschedule",
  workerTimeOff: "workertimeoff",
  site: "site",
  dispatch: "dispatch",
  invoice: "invoice",
  purchaseOrder: "purchaseorder",
  item: "item",
  group: "group",
  compositeItem: "compositeitem",
} as const;

export type AuditTrailModuleKey = keyof typeof AUDIT_TRAIL_MODULES;
export type AuditTrailModuleValue = (typeof AUDIT_TRAIL_MODULES)[AuditTrailModuleKey];

export type AuditTrailModuleOption = {
  value: AuditTrailModuleValue;
  labelKey: AuditTrailModuleKey;
};

/** Options for the Settings Audit Logs module filter. */
export const AUDIT_TRAIL_MODULE_OPTIONS: readonly AuditTrailModuleOption[] = [
  { value: AUDIT_TRAIL_MODULES.materialRequest, labelKey: "materialRequest" },
  { value: AUDIT_TRAIL_MODULES.quotation, labelKey: "quotation" },
  { value: AUDIT_TRAIL_MODULES.client, labelKey: "client" },
  { value: AUDIT_TRAIL_MODULES.vendor, labelKey: "vendor" },
  { value: AUDIT_TRAIL_MODULES.quotationTag, labelKey: "quotationTag" },
  { value: AUDIT_TRAIL_MODULES.contact, labelKey: "contact" },
  { value: AUDIT_TRAIL_MODULES.job, labelKey: "job" },
  { value: AUDIT_TRAIL_MODULES.project, labelKey: "project" },
  { value: AUDIT_TRAIL_MODULES.jobSchedule, labelKey: "jobSchedule" },
  { value: AUDIT_TRAIL_MODULES.workerTimeOff, labelKey: "workerTimeOff" },
  { value: AUDIT_TRAIL_MODULES.site, labelKey: "site" },
  { value: AUDIT_TRAIL_MODULES.dispatch, labelKey: "dispatch" },
  { value: AUDIT_TRAIL_MODULES.invoice, labelKey: "invoice" },
  { value: AUDIT_TRAIL_MODULES.purchaseOrder, labelKey: "purchaseOrder" },
  { value: AUDIT_TRAIL_MODULES.item, labelKey: "item" },
  { value: AUDIT_TRAIL_MODULES.group, labelKey: "group" },
  { value: AUDIT_TRAIL_MODULES.compositeItem, labelKey: "compositeItem" },
] as const;
