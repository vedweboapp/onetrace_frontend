export const CONTACT_PATHS = {
  list: "contact/",
  detail: (id: number) => `contact/${id}/`,
} as const;
