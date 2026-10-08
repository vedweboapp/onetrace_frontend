import type { TabLayoutChoice, TabLayoutsMap } from "@/shared/utils/tab-layout.util";

/**
 * Appearance-setting defaults for detail/form tab order.
 * Used on first login / new users when the profile has no `tab_layouts` yet.
 * Keep in sync with BE `appearance_settings.preferences.tab_layouts` seeds.
 */
export const DEFAULT_TAB_LAYOUTS: TabLayoutsMap = {
  clientDetail: {
    order: ["details", "contacts", "sites", "projects", "timeline"],
    hidden: [],
  },
  contactDetail: { order: ["details", "timeline"], hidden: [] },
  siteDetail: { order: ["details", "timeline"], hidden: [] },
  vendorDetail: {
    order: ["details", "contacts", "items", "timeline"],
    hidden: [],
  },
  projectDetail: {
    order: [
      "details",
      "forms",
      "drawings",
      "quotations",
      "jobs",
      "jobsheets",
      "location",
      "docs",
      "approvals",
      "timeline",
    ],
    hidden: [],
  },
  jobDetail: {
    order: ["overview", "scheduling", "materials", "dispatch", "returns", "forms", "timeline"],
    hidden: [],
  },
  quotationDetail: {
    order: [
      "details",
      "vendors",
      "jobs",
      "jobsheets",
      "schedule",
      "location",
      "docs",
      "approvals",
      "timeline",
    ],
    hidden: [],
  },
  quotationDetailBody: { order: ["project", "pricing"], hidden: [] },
  quotationForm: { order: ["project", "pricing"], hidden: [] },
  quotationFormModal: { order: ["project", "pricing"], hidden: [] },
  invoiceDetail: { order: ["overview", "lineItems", "timeline"], hidden: [] },
  purchaseOrderDetail: { order: ["overview", "lineItems", "timeline"], hidden: [] },
  materialRequestDetail: { order: ["overview", "dispatches", "timeline"], hidden: [] },
  userDetail: { order: ["overview", "scheduling"], hidden: [] },
  usersSettings: { order: ["users", "groups"], hidden: [] },
  personalProfile: { order: ["profile", "appearance"], hidden: [] },
  companySettings: { order: ["organization", "currencies", "schedule"], hidden: [] },
  zohoConnection: { order: ["help", "configure", "webhook", "history"], hidden: [] },
  schedulingDayAgenda: { order: ["jobs", "timeoff"], hidden: [] },
  formBuilder: { order: ["form", "rules", "preview"], hidden: [] },
};

export function getDefaultTabLayout(scope: string): TabLayoutChoice | null {
  return DEFAULT_TAB_LAYOUTS[scope] ?? null;
}
