export const CLIENT_PATHS = {
  list: "clients/",
  detail: (id: number) => `clients/${id}/`,
} as const;
