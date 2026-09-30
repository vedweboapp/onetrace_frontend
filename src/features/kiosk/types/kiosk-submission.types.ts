/**
 * Kiosk Checkout Schema
 * ──────────────────────────────────────────────────────────────────────────────
 * Defines the exact shape of the payload sent to the backend checkout endpoint:
 * POST /api/v1/checkout/
 * ──────────────────────────────────────────────────────────────────────────────
 */

export interface CheckoutCustomer {
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  vat_registered: boolean;
  vat_number?: string;
}

export interface CheckoutBillingAddress {
  address_line1: string;
  address_line2?: string;
  city: string;
  postcode: string;
  country: string;
}

export interface CheckoutValueItem {
  o_id: number | string;
  id: number | string;
  value: string | number;
  price: number;
}

export interface CheckoutItem {
  q_id: number | string;
  id: number | string;
  values: CheckoutValueItem[];
}

export interface KioskCheckoutPayload {
  organization_id: number;
  kiosk_machine_id: number;
  customer: CheckoutCustomer;
  billing_address: CheckoutBillingAddress;
  items: CheckoutItem[];
  snapshot_image: string;
}

export interface KioskCheckoutResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
  id?: number | string;
  order_id?: number | string;
  invoice_id?: number | string;
  [key: string]: unknown;
}
