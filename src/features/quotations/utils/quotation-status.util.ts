/** Quotation workflow statuses supported by the API. */
export type QuotationStatus = "draft" | "sent" | "approved" | "rejected";

export const QUOTATION_STATUS_OPTIONS: { value: QuotationStatus; labelKey: string }[] = [
  { value: "draft", labelKey: "quoteStatus.draft" },
  { value: "sent", labelKey: "quoteStatus.sent" },
  { value: "approved", labelKey: "quoteStatus.approved" },
  { value: "rejected", labelKey: "quoteStatus.rejected" },
];

/** Map legacy/API aliases to a selectable status value. */
export function normalizeQuotationStatusValue(raw: string | null | undefined): QuotationStatus | "" {
  const code = raw == null ? "" : String(raw).trim().toLowerCase();
  if (!code) return "";
  if (code === "draft") return "draft";
  if (code === "sent") return "sent";
  if (code === "approved" || code === "accepted") return "approved";
  if (code === "rejected") return "rejected";
  return "";
}

export function quotationStatusLabel(
  raw: string | null | undefined,
  t: (key: string) => string,
): string {
  const normalized = normalizeQuotationStatusValue(raw);
  if (!normalized) return raw?.trim() || "—";
  const match = QUOTATION_STATUS_OPTIONS.find((o) => o.value === normalized);
  return match ? t(match.labelKey) : raw?.trim() || "—";
}
