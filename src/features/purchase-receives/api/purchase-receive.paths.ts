export const PURCHASE_RECEIVE_PATHS = {
  list: "purchasereceives/",
  detail: (id: number) => `purchasereceives/${id}/`,
} as const;
