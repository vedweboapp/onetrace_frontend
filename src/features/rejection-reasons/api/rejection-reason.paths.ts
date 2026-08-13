export const REJECTION_REASON_PATHS = {
  list: "rejection-reason/",
  detail: (id: number) => `rejection-reason/${id}/`,
} as const;
