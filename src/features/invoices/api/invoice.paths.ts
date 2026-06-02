export const INVOICE_PATHS = {
  list: "invoices/",
  detail: (id: number) => `invoices/${id}/`,
  send: (id: number) => `invoices/${id}/send/`,
} as const;
