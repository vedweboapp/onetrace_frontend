export const PAYMENT_TERM_PATHS = {
  list: "paymentterms/",
  detail: (id: number) => `paymentterms/${id}/`,
} as const;
