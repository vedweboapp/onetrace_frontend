import { rootCertificates } from "tls";

export const routes = {
  home: "/",
  auth: {
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
  },
  dashboard: {
    root: "/dashboard",
    clients: "/dashboard/clients",
    contacts: "/dashboard/contacts",
    sites: "/dashboard/sites",
    quotations: "/dashboard/quotations",
    invoices: "/dashboard/invoices",
    jobs: "/dashboard/jobs",
    qrCodes: "/dashboard/qr-codes",
    projects: "/dashboard/projects",
    groups: "/dashboard/groups",
    items: "/dashboard/items",
    compositeItems: "/dashboard/composite-items",
    materialRequests: "/dashboard/material-requests",
    dispatches: "/dashboard/dispatches",
    settings: "/dashboard/settings",
    settingsPinStatus: "/dashboard/settings/pin-status",
    settingsJobStatus: "/dashboard/settings/job-status",
    settingsTags: "/dashboard/settings/tag",
    settingsProjectTypes: "/dashboard/settings/project-type",
    settingsInstallationTypes: "/dashboard/settings/installation-type",
    settingsCustomization: "/dashboard/settings/customization",
    settingsUsers: "/dashboard/settings/users",
    settingsPersonalProfile: "/dashboard/settings/personal-profile",
    settingsCompanySettings: "/dashboard/settings/company-settings",
    settingsModules: "/dashboard/settings/modules",
    settingsProjectForms: "/dashboard/settings/project-type-forms",
    projectJobsForms: "/dashboard/projects/[id]/job-forms"
  },

} as const;
