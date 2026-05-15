export const PersonalProfilePaths = {
    fetchProfile: (id: string) => `/user-profile/${id}/`,
    updateProfile: (id: string) => `/user-profile/${id}/`,
} as const;