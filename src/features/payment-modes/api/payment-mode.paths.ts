export const PAYMENT_MODE_PATHS = {
  list: "paymentmodes/",
  detail: (id: number) => `paymentmodes/${id}/`,
} as const;

