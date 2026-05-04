export const routes = {
  home: "/",
  auth: {
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
  },
  dashboard: {
    root: "/dashboard",
    projects: "/dashboard/projects",
    settings: "/dashboard/settings",
    settingsAppearance: "/dashboard/settings/appearance",
  },
} as const;
