import type { KioskBillingDetails } from "@/features/kiosk/components/kiosk-invoice-details";
import type { CheckoutItem } from "@/features/kiosk/types/kiosk-submission.types";
import type { KioskAnswerValue } from "@/features/kiosk/utils/kiosk-live-build";

export type PendingKioskCheckout = {
  billingDetails: KioskBillingDetails;
  answers: Record<string, KioskAnswerValue>;
  snapshotImage: string;
  organizationId: number;
  items?: CheckoutItem[];
  cartTotals?: {
    grandTotal: number;
    subtotal: number;
    deliveryFee: number;
    vat: number;
    quantity: number;
  };
  stripeSessionId?: string;
  configName?: string;
  createdAt: number;
};

// ---------------------------------------------------------------------------
// Resilient storage layer
//
// Some browsers block sessionStorage / localStorage when:
//   - The page is loaded inside a cross-origin <iframe>
//   - The user has strict privacy / tracking-prevention settings enabled
//   - The browser is running in a sandboxed / kiosk mode
//
// Cascade: sessionStorage → localStorage → in-memory Map
// The in-memory fallback only survives the current page session but is enough
// for the Stripe redirect flow (same tab, same JS context).
// ---------------------------------------------------------------------------

const memoryStore = new Map<string, string>();

function trySet(key: string, value: string): void {
  // 1. Try sessionStorage (preferred — scoped to the tab)
  try {
    sessionStorage.setItem(key, value);
    return;
  } catch {
    // blocked
  }
  // 2. Fall back to localStorage
  try {
    localStorage.setItem(key, value);
    return;
  } catch {
    // blocked
  }
  // 3. Last resort: keep in memory for the current page session
  memoryStore.set(key, value);
}

function tryGet(key: string): string | null {
  try {
    const v = sessionStorage.getItem(key);
    if (v !== null) return v;
  } catch {
    // blocked
  }
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
  } catch {
    // blocked
  }
  return memoryStore.get(key) ?? null;
}

function tryRemove(key: string): void {
  try { sessionStorage.removeItem(key); } catch { /* blocked */ }
  try { localStorage.removeItem(key); } catch { /* blocked */ }
  memoryStore.delete(key);
}

// ---------------------------------------------------------------------------

function storageKey(kioskId: string): string {
  return `kiosk_pending_checkout_${kioskId}`;
}

export function savePendingKioskCheckout(kioskId: string, data: PendingKioskCheckout): void {
  if (typeof window === "undefined") return;
  trySet(storageKey(kioskId), JSON.stringify(data));
}

export function readPendingKioskCheckout(kioskId: string): PendingKioskCheckout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = tryGet(storageKey(kioskId));
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
  tryRemove(storageKey(kioskId));
}

function completedKey(kioskId: string): string {
  return `kiosk_checkout_completed_${kioskId}`;
}

export function markKioskCheckoutCompleted(kioskId: string, sessionId: string): void {
  if (typeof window === "undefined") return;
  trySet(completedKey(kioskId), sessionId);
}

export function readKioskCheckoutCompleted(kioskId: string): string | null {
  if (typeof window === "undefined") return null;
  return tryGet(completedKey(kioskId));
}

