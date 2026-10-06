export type CreateKioskStripeCheckoutInput = {
  amountPence: number;
  currency?: string;
  customerEmail?: string;
  productName?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

export type CreateKioskStripeCheckoutResult = {
  url: string;
  sessionId: string;
};

export type VerifiedStripeCheckoutSession = {
  paid: boolean;
  status: string | null;
  payment_status: string | null;
  customer_email: string | null;
  amount_total: number | null;
  currency: string | null;
  metadata: Record<string, string>;
};

function readErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

export async function createKioskStripeCheckoutSession(
  input: CreateKioskStripeCheckoutInput,
): Promise<CreateKioskStripeCheckoutResult> {
  const res = await fetch("/api/stripe/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(readErrorMessage(data, "Could not start Stripe checkout."));
  }
  const url = data && typeof data === "object" && "url" in data ? String((data as { url?: unknown }).url ?? "") : "";
  const sessionId =
    data && typeof data === "object" && "sessionId" in data
      ? String((data as { sessionId?: unknown }).sessionId ?? "")
      : "";
  if (!url || !sessionId) {
    throw new Error("Stripe did not return a checkout URL.");
  }
  return { url, sessionId };
}

export async function verifyKioskStripeCheckoutSession(
  sessionId: string,
): Promise<VerifiedStripeCheckoutSession> {
  const res = await fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`);
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(readErrorMessage(data, "Could not verify Stripe payment."));
  }
  const rec = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    paid: rec.paid === true,
    status: typeof rec.status === "string" ? rec.status : null,
    payment_status: typeof rec.payment_status === "string" ? rec.payment_status : null,
    customer_email: typeof rec.customer_email === "string" ? rec.customer_email : null,
    amount_total: typeof rec.amount_total === "number" ? rec.amount_total : null,
    currency: typeof rec.currency === "string" ? rec.currency : null,
    metadata:
      rec.metadata && typeof rec.metadata === "object" && !Array.isArray(rec.metadata)
        ? Object.fromEntries(
            Object.entries(rec.metadata as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string",
            ),
          )
        : {},
  };
}
