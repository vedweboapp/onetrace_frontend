export const INVOICE_PATHS = {
  list: "invoice/",
  detail: (id: number) => `invoice/${id}/`,
  send: (id: number) => `invoice/${id}/send/`,
} as const;
