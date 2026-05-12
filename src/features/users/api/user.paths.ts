export const USER_PATHS = {
  list: "user-profile/",
  detail: (id: number) => `user-profile/${id}/`,
  invite: "auth/invite-user/",
  roles: "role/",
} as const;
