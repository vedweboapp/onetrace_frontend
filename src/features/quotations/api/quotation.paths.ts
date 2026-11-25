export const QUOTATION_PATHS = {
  list: "quotations/",
  detail: (id: number) => `quotations/${id}/`,
  send: (id: number) => `quotations/${id}/send/`,
  createJob: (id: number) => `quotations/${id}/create-job/`,
  createPurchaseOrder: (id: number) => `quotations/${id}/create-purchase-order/`,
  updateItemStatus: (id: number) => `quotations/${id}/update-item-status/`,
  downloadPdf: (id: number) => `documents/quotations/${id}/download-pdf`,
  /** Quotation attachments folders */
  folders: (id: number) => `quotations/${id}/folders/`,
  folderDetail: (quotationId: number, folderId: number) =>
    `quotations/${quotationId}/folders/${folderId}/`,
  /** Project levels (drawings) for quotation form. */
  projectLevels: (projectId: number) => `project/${projectId}/level/`,
} as const;
