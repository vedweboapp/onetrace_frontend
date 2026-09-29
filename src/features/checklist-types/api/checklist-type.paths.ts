export const CHECKLIST_TYPE_PATHS = {
  list: "checklist-type/",
  detail: (id: number) => `checklist-type/${id}/`,
} as const;
