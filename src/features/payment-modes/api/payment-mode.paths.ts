export const PAYMENT_MODE_PATHS = {
  list: "paymentsmodes/",
  detail: (id: number) => `paymentsmodes/${id}/`,
} as const;
