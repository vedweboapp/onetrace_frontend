export const COMPANY_SETTING_PATH = {
    getOrganizationDetails: (id: number) => `organizationsettings/${id}/`,
    updateOrganizationDetails: (id: number) => `organizationsettings/${id}/`,
} as const;