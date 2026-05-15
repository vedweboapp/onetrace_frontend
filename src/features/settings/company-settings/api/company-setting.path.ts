export const COMPANY_SETTING_PATH = {
    getOrganizationDetails: (id: number) => `/organization/${id}`,
    updateOrganizationDetails: (id: number) => `/organization/${id}`,
} as const;