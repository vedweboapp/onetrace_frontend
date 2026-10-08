"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { submitKioskCheckout } from "@/features/kiosk/api/kiosk.api";
import {
  buildKioskCheckoutFormData,
  dataUrlToBlob,
} from "@/features/kiosk/utils/kiosk-submission.builder";
import { parseCheckoutOrderSummary, type KioskOrderCompleteInfo } from "@/features/kiosk/utils/kiosk-order-summary.util";
import { KioskOrderCompleteCard } from "@/features/kiosk/components/kiosk-order-complete-card";
import type { KioskBillingDetails } from "@/features/kiosk/components/kiosk-invoice-details";
import type { CheckoutItem } from "@/features/kiosk/types/kiosk-submission.types";
import { AlertCircle, Loader2 } from "lucide-react";

type PageState = "verifying" | "submitting" | "success" | "error";

/** Shape of the data stashed in sessionStorage by the kiosk page before Stripe redirect */
interface PendingCheckoutData {
  billingDetails: KioskBillingDetails;
  snapshotImage: string;
  organizationId: number;
  configAnswers?: Record<string, unknown>;
  answers?: Record<string, unknown>;
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
  const [orderDetails, setOrderDetails] = useState<KioskOrderCompleteInfo | null>(null);

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
          const cached = JSON.parse(completedRaw) as KioskOrderCompleteInfo;
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
        const fallbackSummary: KioskOrderCompleteInfo = {
          totalAmount: verifyData.amount_total != null ? (verifyData.amount_total / 100).toFixed(2) : undefined,
          email: verifyData.customer_email,
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
            answers: pendingData.answers ?? pendingData.configAnswers ?? {},
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
        const orderSummary = parseCheckoutOrderSummary(checkoutRes);
        if (orderSummary.totalAmount == null && pendingData.cartTotals?.grandTotal != null) {
          orderSummary.totalAmount = pendingData.cartTotals.grandTotal;
        }
        if (verifyData.amount_total != null && orderSummary.totalAmount == null) {
          orderSummary.totalAmount = (verifyData.amount_total / 100).toFixed(2);
        }
        orderSummary.productName = pendingData.configName;
        orderSummary.email = pendingData.billingDetails.email || verifyData.customer_email;

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
  const kioskHomeHref =
    typeof window !== "undefined"
      ? `${window.location.pathname.replace(/\/payment-success\/?$/, "")}${token ? `?token=${encodeURIComponent(token)}` : ""}`
      : `/public/kiosk/${kioskId ?? ""}${token ? `?token=${encodeURIComponent(token)}` : ""}`;

  return (
    <KioskOrderCompleteCard
      order={orderDetails}
      email={orderDetails?.email || customerEmail}
      productName={orderDetails?.productName}
      configureHref={kioskHomeHref}
    />
  );
}