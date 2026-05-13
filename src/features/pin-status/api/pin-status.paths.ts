export const PIN_STATUS_PATHS = {
  list: "pin-status/",
  detail: (id: number) => `pin-status/${id}/`,
} as const;
