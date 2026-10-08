import { fetchOrderPaymentStatus } from "@/features/kiosk/api/kiosk.api";

export type KioskOrderCompleteInfo = {
  orderNumber?: string;
  totalAmount?: string | number;
  email?: string | null;
  productName?: string | null;
  paymentStatus?: string | null;
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

function pickAmount(record: Record<string, unknown> | null): string | number | undefined {
  if (!record) return undefined;
  const total =
    asTrimmedString(record.total_amount) ??
    (typeof record.total_amount === "number" ? record.total_amount : undefined) ??
    asTrimmedString(record.amount_paid) ??
    (typeof record.amount_paid === "number" ? record.amount_paid : undefined) ??
    asTrimmedString(record.grand_total) ??
    (typeof record.grand_total === "number" ? record.grand_total : undefined);
  return total;
}

function pickOrderNumber(record: Record<string, unknown> | null): string | undefined {
  if (!record) return undefined;
  return (
    asTrimmedString(record.order_number) ??
    asTrimmedString(record.order_id) ??
    asTrimmedString(record.number)
  );
}

function pickEmail(record: Record<string, unknown> | null): string | undefined {
  if (!record) return undefined;
  const direct =
    asTrimmedString(record.email) ??
    asTrimmedString(record.customer_email) ??
    asTrimmedString(record.receipt_email);
  if (direct) return direct;
  const customer = asRecord(record.customer);
  return asTrimmedString(customer?.email) ?? asTrimmedString(customer?.customer_email);
}

function pickProductName(record: Record<string, unknown> | null): string | undefined {
  if (!record) return undefined;
  const direct =
    asTrimmedString(record.product_name) ??
    asTrimmedString(record.service_form_name) ??
    asTrimmedString(record.kiosk_name) ??
    asTrimmedString(record.config_name);
  if (direct) return direct;
  const serviceForm = asRecord(record.service_form);
  const kiosk = asRecord(record.kiosk);
  return (
    asTrimmedString(serviceForm?.name) ??
    asTrimmedString(serviceForm?.title) ??
    asTrimmedString(kiosk?.name) ??
    asTrimmedString(kiosk?.title)
  );
}

/** Pull customer-facing fields from POST /checkout/ — never expose client_secret. */
export function parseCheckoutOrderSummary(response: unknown): KioskOrderCompleteInfo {
  const root = asRecord(response);
  const data = asRecord(root?.data);
  return {
    orderNumber: pickOrderNumber(data) ?? pickOrderNumber(root),
    totalAmount: pickAmount(data) ?? pickAmount(root),
  };
}

/** Pull success-card fields from GET /order/{orderNumber}/payment-status/. */
export function parsePaymentStatusOrderSummary(response: unknown): KioskOrderCompleteInfo {
  const root = asRecord(response);
  const data = asRecord(root?.data) ?? root;
  return {
    orderNumber: pickOrderNumber(data) ?? pickOrderNumber(root),
    totalAmount: pickAmount(data) ?? pickAmount(root),
    email: pickEmail(data) ?? pickEmail(root) ?? null,
    productName: pickProductName(data) ?? pickProductName(root) ?? null,
    paymentStatus:
      asTrimmedString(data?.payment_status) ??
      asTrimmedString(root?.payment_status) ??
      asTrimmedString(data?.status) ??
      asTrimmedString(root?.status) ??
      null,
  };
}

/**
 * After checkout, load the order card from payment-status (preferred),
 * falling back to the checkout summary if payment-status is unavailable.
 */
export async function resolveOrderCompleteFromPaymentStatus(
  checkoutResponse: unknown,
  extras?: { email?: string | null; productName?: string | null; totalAmount?: string | number | null },
): Promise<KioskOrderCompleteInfo> {
  const fromCheckout = parseCheckoutOrderSummary(checkoutResponse);
  const orderNumber = fromCheckout.orderNumber?.trim();

  let fromStatus: KioskOrderCompleteInfo | null = null;
  if (orderNumber) {
    try {
      const statusRes = await fetchOrderPaymentStatus(orderNumber);
      fromStatus = parsePaymentStatusOrderSummary(statusRes);
    } catch (err) {
      console.warn("[kiosk] payment-status fetch failed; using checkout summary", err);
    }
  }

  return {
    orderNumber: fromStatus?.orderNumber?.trim() || orderNumber,
    totalAmount:
      fromStatus?.totalAmount ??
      extras?.totalAmount ??
      fromCheckout.totalAmount,
    email: fromStatus?.email || extras?.email || null,
    productName: fromStatus?.productName || extras?.productName || null,
    paymentStatus: fromStatus?.paymentStatus ?? null,
  };
}

export function formatKioskOrderAmount(amount?: string | number | null): string | null {
  if (amount == null || amount === "") return null;
  const num = typeof amount === "number" ? amount : Number.parseFloat(String(amount).replace(/,/g, ""));
  if (!Number.isFinite(num)) return String(amount);
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(num);
}
