"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { submitKioskCheckout } from "@/features/kiosk/api/kiosk.api";
import {
  buildKioskCheckoutFormData,
  dataUrlToBlob,
} from "@/features/kiosk/utils/kiosk-submission.builder";
import type { KioskBillingDetails } from "@/features/kiosk/components/kiosk-invoice-details";
import type { CheckoutItem } from "@/features/kiosk/types/kiosk-submission.types";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type PageState = "verifying" | "submitting" | "success" | "error";

/** Shape of the data stashed in sessionStorage by the kiosk page before Stripe redirect */
interface PendingCheckoutData {
  billingDetails: KioskBillingDetails;
  snapshotImage: string;
  organizationId: number;
  configAnswers: Record<string, unknown>;
  items?: CheckoutItem[];
  configId?: string | number;
  configName?: string;
  cartTotals?: {
    subtotal: number;
    deliveryFee: number;
    vat: number;
    grandTotal: number;
  };
}

export interface CheckoutOrderSummary {
  orderNumber?: string;
  paymentIntentId?: string;
  totalAmount?: string | number;
}

function formatCurrency(amount?: string | number | null): string | null {
  if (amount == null || amount === "") return null;
  const num = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (isNaN(num)) return String(amount);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(num);
}

/**
 * /public/kiosk/[id]/payment-success
 *
 * Stripe redirects here after a successful checkout.
 *
 * Security flow:
 *  1. Verify payment via our server-side /api/stripe/verify-session route
 *     (secret key never touches the client)
 *  2. Only if payment_status === "paid" do we submit the backend order
 *  3. Restore billing/snapshot data from sessionStorage (stashed pre-redirect)
 */
export default function PaymentSuccessPage() {
  const params = useParams<{ id?: string | string[] }>();
  const searchParams = useSearchParams();
  const kioskId = Array.isArray(params.id) ? params.id[0] : params.id;

  const sessionId = searchParams.get("session_id");
  const token = searchParams.get("token") ?? undefined;

  const [state, setState] = useState<PageState>("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<CheckoutOrderSummary | null>(null);

  // Guard against React Strict Mode double-invocation
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    void (async () => {
      // ── Step 1: Verify Stripe payment (server-side API route) ───────────────
      if (!sessionId) {
        setErrorMessage("Payment session ID is missing. Please contact support.");
        setState("error");
        return;
      }

      let verifyData: {
        paid: boolean;
        customer_email?: string | null;
        metadata?: Record<string, string>;
        amount_total?: number | null;
        currency?: string | null;
        payment_intent_id?: string | null;
      };

      try {
        const res = await fetch(
          `/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`,
        );

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setErrorMessage(
            body.error ?? "Payment verification failed. Please contact support.",
          );
          setState("error");
          return;
        }

        verifyData = (await res.json()) as typeof verifyData;

        if (!verifyData.paid) {
          setErrorMessage(
            "Payment has not been confirmed yet. If you were charged, please contact support with your payment reference.",
          );
          setState("error");
          return;
        }
      } catch {
        setErrorMessage(
          "Could not reach the payment verification service. Please try refreshing the page.",
        );
        setState("error");
        return;
      }

      setCustomerEmail(verifyData.customer_email ?? null);

      // Check if order was already submitted and cached (e.g. user refreshes success page)
      const completedKey = `kiosk_completed_order_${sessionId}`;
      try {
        const completedRaw = sessionStorage.getItem(completedKey);
        if (completedRaw) {
          const cached = JSON.parse(completedRaw) as CheckoutOrderSummary;
          setOrderDetails(cached);
          setState("success");
          return;
        }
      } catch { /* ignore */ }

      // ── Step 2: Restore pending checkout data from sessionStorage ───────────
      const storageKey = `kiosk_pending_checkout_${kioskId}`;
      let pendingData: PendingCheckoutData | null = null;

      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) {
          pendingData = JSON.parse(raw) as PendingCheckoutData;
        }
      } catch {
        console.warn("[payment-success] Could not read pending checkout from sessionStorage.");
      }

      if (!pendingData) {
        // Payment confirmed but checkout data was already submitted or storage cleared
        const fallbackSummary: CheckoutOrderSummary = {
          paymentIntentId: verifyData.payment_intent_id ?? undefined,
          totalAmount: verifyData.amount_total != null ? (verifyData.amount_total / 100).toFixed(2) : undefined,
        };
        setOrderDetails(fallbackSummary);
        setState("success");
        return;
      }

      // ── Step 3: Build the FormData payload and submit to backend ────────────
      setState("submitting");

      try {
        let checkoutFormData: FormData;

        // If we have pre-built items, use buildKioskCheckoutFormData with a minimal
        // stub config. The real fields (org id, kiosk id, billing, items) are all
        // passed explicitly so the stub config is only used as a type placeholder.
        if (pendingData.items && pendingData.items.length > 0) {
          checkoutFormData = buildKioskCheckoutFormData({
            config: {
              name: pendingData.configName ?? "Kiosk Order",
              questions: [],
            },
            answers: pendingData.configAnswers ?? {},
            billingDetails: pendingData.billingDetails,
            snapshotImage: pendingData.snapshotImage,
            organizationId: pendingData.organizationId,
            items: pendingData.items,
            scene: { summaries: [], totalPrice: 0, overlays: [], canvasImage: "" } as never,
          });
        } else {
          // Fallback: build FormData manually from the stashed billing details
          // (items were not pre-computed — order will still be logged with billing data)
          checkoutFormData = new FormData();
          checkoutFormData.append("organization_id", String(pendingData.organizationId));
          checkoutFormData.append("customer[full_name]", pendingData.billingDetails.fullName.trim());
          checkoutFormData.append("customer[email]", pendingData.billingDetails.email.trim());
          checkoutFormData.append("customer[phone]", pendingData.billingDetails.phone.trim());
          if (pendingData.billingDetails.companyName) {
            checkoutFormData.append("customer[company_name]", pendingData.billingDetails.companyName.trim());
          }
          checkoutFormData.append("customer[vat_registered]", String(!!pendingData.billingDetails.vatRegistered));
          if (pendingData.billingDetails.vatNumber) {
            checkoutFormData.append("customer[vat_number]", pendingData.billingDetails.vatNumber.trim());
          }
          checkoutFormData.append("billing_address[address_line1]", pendingData.billingDetails.addressLine1.trim());
          if (pendingData.billingDetails.addressLine2) {
            checkoutFormData.append("billing_address[address_line2]", pendingData.billingDetails.addressLine2.trim());
          }
          checkoutFormData.append("billing_address[city]", pendingData.billingDetails.city.trim());
          checkoutFormData.append("billing_address[postcode]", pendingData.billingDetails.postcode.trim());
          checkoutFormData.append("billing_address[country]", "United Kingdom");
          checkoutFormData.append("items", JSON.stringify([]));

          // Attach snapshot image blob
          if (pendingData.snapshotImage) {
            const blob = dataUrlToBlob(pendingData.snapshotImage);
            if (blob) {
              checkoutFormData.append(
                "snapshot_image",
                blob,
                `snapshot-${pendingData.organizationId}.png`,
              );
            } else {
              checkoutFormData.append("snapshot_image", pendingData.snapshotImage);
            }
          }
        }

        const checkoutRes = await submitKioskCheckout(checkoutFormData);

        // Extract order details returned from the checkout API
        const resObj = checkoutRes as Record<string, unknown> | undefined;
        const resData = (resObj?.data && typeof resObj.data === "object" ? resObj.data : {}) as Record<string, unknown>;

        const orderNumber = (
          resObj?.order_number ??
          resData?.order_number ??
          resObj?.order_id ??
          resData?.order_id
        ) as string | undefined;

        const paymentIntentId = (
          resObj?.payment_intent_id ??
          resData?.payment_intent_id ??
          resObj?.payment_id ??
          resData?.payment_id ??
          verifyData.payment_intent_id
        ) as string | undefined;

        const rawTotal = (
          resObj?.total_amount ??
          resData?.total_amount ??
          resObj?.price ??
          resData?.price ??
          resObj?.total_price ??
          resData?.total_price ??
          (verifyData.amount_total != null ? (verifyData.amount_total / 100).toFixed(2) : undefined) ??
          pendingData.cartTotals?.grandTotal
        ) as string | number | undefined;

        const orderSummary: CheckoutOrderSummary = {
          orderNumber,
          paymentIntentId,
          totalAmount: rawTotal,
        };

        setOrderDetails(orderSummary);

        // Clean up pending storage and cache the completed order so refresh preserves data
        try {
          sessionStorage.setItem(completedKey, JSON.stringify(orderSummary));
          sessionStorage.removeItem(storageKey);
          sessionStorage.removeItem(`kiosk_answers_${kioskId}`);
        } catch { /* ignore */ }

        setState("success");
      } catch (err) {
        console.error("[payment-success] Backend order submission failed:", err);
        // The payment itself succeeded — don't call it a payment error.
        setErrorMessage(
          "Your payment was received, but we could not automatically place your order. " +
          "Please contact support quoting your payment reference below.",
        );
        setState("error");
      }
    })();
  }, [sessionId, kioskId, token]);

  // ── Loading states ─────────────────────────────────────────────────────────
  if (state === "verifying" || state === "submitting") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f5f7] px-4 dark:bg-slate-950">
        <div className="flex size-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
          <Loader2 className="size-8 animate-spin" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-slate-900 dark:text-slate-100">
          {state === "verifying" ? "Verifying your payment…" : "Placing your order…"}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {state === "verifying"
            ? "Securely confirming payment with Stripe. Please wait."
            : "Submitting your configuration to our team. Please don't close this tab."}
        </p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f5f7] px-4 text-center dark:bg-slate-950">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
          <AlertCircle className="size-8" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-slate-900 dark:text-slate-100">
          Something went wrong
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {errorMessage}
        </p>
        {/* Always show the payment reference so the user can contact support */}
        {sessionId && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Payment Reference
            </p>
            <p className="mt-0.5 font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
              {sessionId}
            </p>
          </div>
        )}
        <a
          href={`/public/kiosk/${kioskId ?? ""}${token ? `?token=${token}` : ""}`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#701524] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5a101c] transition"
        >
          Return to Kiosk
        </a>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  const formattedTotal = formatCurrency(orderDetails?.totalAmount);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f5f7] px-4 py-10 text-center dark:bg-slate-950">
      {/* Success icon */}
      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400">
        <CheckCircle className="size-8" />
      </div>

      <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-slate-100">
        Payment Successful!
      </h2>

      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
        Thank you! Your payment
        {formattedTotal ? (
          <>
            {" "}of{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formattedTotal}
            </span>
          </>
        ) : null}
        {" "}was confirmed and{" "}
        {orderDetails?.orderNumber ? (
          <>
            order{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
              #{orderDetails.orderNumber}
            </span>{" "}
            has been placed.
          </>
        ) : (
          "your order has been placed."
        )}
        {customerEmail && (
          <>
            {" "}A confirmation receipt will be sent to{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {customerEmail}
            </span>
            .
          </>
        )}
      </p>

      {/* Order & Payment Summary Card */}
      <div className="mt-6 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Payment &amp; Order Details
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Paid
          </span>
        </div>

        <dl className="mt-4 space-y-3.5 text-sm">
          {/* Order Number */}
          {orderDetails?.orderNumber && (
            <div className="flex items-center justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Order Number</dt>
              <dd className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded text-sm">
                #{orderDetails.orderNumber}
              </dd>
            </div>
          )}

          {/* Price / Total Amount */}
          {formattedTotal && (
            <div className="flex items-center justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Price (Total Amount)</dt>
              <dd className="font-mono font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                {formattedTotal}
              </dd>
            </div>
          )}

          {/* Payment ID (payment_intent_id) */}
          {(orderDetails?.paymentIntentId || sessionId) && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Payment ID (payment_intent_id)</dt>
                {orderDetails?.paymentIntentId && (
                  <span className="text-[10px] text-slate-400">Stripe Payment Intent</span>
                )}
              </div>
              <dd className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all select-all bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded border border-slate-200/70 dark:border-slate-800">
                {orderDetails?.paymentIntentId || sessionId}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <a
          href={`/public/kiosk/${kioskId ?? ""}${token ? `?token=${token}` : ""}`}
          className="rounded-lg bg-[#701524] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5a101c] transition"
        >
          Configure Another Product
        </a>
      </div>
    </div>
  );
}
