export const VENDOR_PATHS = {
  list: "vendors/",
  detail: (id: number) => `vendors/${id}/`,
  /** GET /vendors/{id}/approved-quotations/ — approved quote lines for PO items */
  approvedQuotations: (id: number | string) => `vendors/${id}/approved-quotations/`,
} as const;
