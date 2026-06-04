export const INSTALLATION_TYPE_PATHS = {
  list: "installation-type/",
  detail: (id: number) => `installation-type/${id}/`,
} as const;
