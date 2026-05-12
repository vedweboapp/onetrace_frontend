export const CONTACT_PATHS = {
  list: "contacts/",
  detail: (id: number) => `contacts/${id}/`,
} as const;
