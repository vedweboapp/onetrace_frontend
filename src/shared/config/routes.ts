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
    settingsAppearance: "/dashboard/settings/appearance",
    settingsPinStatus: "/dashboard/settings/pin-status",
    settingsTags: "/dashboard/settings/tag",
    settingsUsers: "/dashboard/settings/users",
  },
} as const;
