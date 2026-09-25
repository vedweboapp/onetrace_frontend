export const QR_CODE_PATHS = {
  list: "qr-codes/",
  generate: "qr-codes/generate/",
  detail: (id: number) => `qr-codes/${id}/`,
} as const;
 