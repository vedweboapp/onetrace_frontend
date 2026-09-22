export const KIOSK_MACHINE_PATHS = {
  list: "kioskmachine/",
  detail: (id: number) => `kioskmachine/${id}/`,
  activate: "admin/kiosk/activate/",
} as const;
