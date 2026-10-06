import type { KioskBillingDetails } from "@/features/kiosk/components/kiosk-invoice-details";
import type { CheckoutItem } from "@/features/kiosk/types/kiosk-submission.types";
import type { KioskAnswerValue } from "@/features/kiosk/utils/kiosk-live-build";

export type PendingKioskCheckout = {
  billingDetails: KioskBillingDetails;
  answers: Record<string, KioskAnswerValue>;
  snapshotImage: string;
  organizationId: number;
  kioskMachineId: number;
  items?: CheckoutItem[];
  cartTotals?: {
    grandTotal: number;
    subtotal: number;
    deliveryFee: number;
    vat: number;
    quantity: number;
  };
  stripeSessionId?: string;
  createdAt: number;
};

function storageKey(kioskId: string): string {
  return `kiosk_pending_checkout_${kioskId}`;
}

export function savePendingKioskCheckout(kioskId: string, data: PendingKioskCheckout): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(kioskId), JSON.stringify(data));
  } catch {
    throw new Error("Could not save checkout details in this browser. Please try again.");
  }
}

export function readPendingKioskCheckout(kioskId: string): PendingKioskCheckout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(kioskId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingKioskCheckout;
    if (!parsed?.billingDetails || !parsed?.snapshotImage) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingKioskCheckout(kioskId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(storageKey(kioskId));
}

function completedKey(kioskId: string): string {
  return `kiosk_checkout_completed_${kioskId}`;
}

export function markKioskCheckoutCompleted(kioskId: string, sessionId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(completedKey(kioskId), sessionId);
}

export function readKioskCheckoutCompleted(kioskId: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(completedKey(kioskId));
}

