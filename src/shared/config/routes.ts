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
    projects: "/dashboard/projects",
    groups: "/dashboard/groups",
    compositeItems: "/dashboard/composite-items",
    settings: "/dashboard/settings",
    settingsAppearance: "/dashboard/settings/appearance",
    settingsPinStatus: "/dashboard/settings/pin-status",
  },
} as const;
