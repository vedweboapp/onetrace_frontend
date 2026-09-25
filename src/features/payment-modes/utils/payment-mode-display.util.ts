import type { PaymentMode } from "../types/payment-mode.types";

export function formatPaymentModeLabel(row: PaymentMode): string {
  return row.name?.trim() || row.system_name?.trim() || `Payment mode #${row.id}`;
}

/** API system_name: lowercase snake_case from display name. */
export function toPaymentModeSystemName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}
