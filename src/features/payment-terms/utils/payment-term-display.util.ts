import type { PaymentTerm } from "../types/payment-term.types";

export function formatPaymentTermLabel(row: PaymentTerm): string {
  return row.payment_term_label?.trim() || `Payment term #${row.id}`;
}

export function formatPaymentTermDiscount(row: PaymentTerm): string {
  const raw = row.payment_terms_discount_percentage;
  if (raw == null || raw === "") return "0";
  const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
  if (!Number.isFinite(n)) return String(raw);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
