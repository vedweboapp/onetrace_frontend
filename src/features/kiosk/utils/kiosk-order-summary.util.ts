export type KioskOrderCompleteInfo = {
  orderNumber?: string;
  totalAmount?: string | number;
  email?: string | null;
  productName?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** Pull customer-facing fields from POST /checkout/ — never expose client_secret. */
export function parseCheckoutOrderSummary(response: unknown): KioskOrderCompleteInfo {
  const root = asRecord(response);
  const data = asRecord(root?.data);
  return {
    orderNumber:
      asTrimmedString(data?.order_number) ??
      asTrimmedString(root?.order_number) ??
      asTrimmedString(data?.order_id) ??
      asTrimmedString(root?.order_id),
    totalAmount:
      asTrimmedString(data?.total_amount) ??
      asTrimmedString(root?.total_amount) ??
      (typeof data?.total_amount === "number" ? data.total_amount : undefined) ??
      (typeof root?.total_amount === "number" ? root.total_amount : undefined),
  };
}

export function formatKioskOrderAmount(amount?: string | number | null): string | null {
  if (amount == null || amount === "") return null;
  const num = typeof amount === "number" ? amount : Number.parseFloat(String(amount).replace(/,/g, ""));
  if (!Number.isFinite(num)) return String(amount);
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(num);
}
