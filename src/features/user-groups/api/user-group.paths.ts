export const USER_GROUP_PATHS = {
  list: "user-group/",
  detail: (id: number) => `user-group/${id}/`,
} as const;
