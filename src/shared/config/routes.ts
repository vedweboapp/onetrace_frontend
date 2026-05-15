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
    projects: "/dashboard/projects",
    groups: "/dashboard/groups",
    items: "/dashboard/items",
    compositeItems: "/dashboard/composite-items",
    settings: "/dashboard/settings",
    settingsPinStatus: "/dashboard/settings/pin-status",
    settingsTags: "/dashboard/settings/tag",
    settingsUsers: "/dashboard/settings/users",
    settingsPersonalProfile: "/dashboard/settings/personal-profile",
    settingsCompanySettings: "/dashboard/settings/company-settings",
    settingsFormBuilder: "/dashboard/settings/form-builder",

  },

} as const;
