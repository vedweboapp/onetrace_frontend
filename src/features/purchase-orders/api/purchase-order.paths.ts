export const PURCHASE_ORDER_PATHS = {
  list: "purchase-orders/",
  detail: (id: number) => `purchase-orders/${id}/`,
} as const;
