"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getPublicKioskById, submitKioskCheckout } from "@/features/kiosk/api/kiosk.api";
import type { KioskConfig } from "@/features/kiosk/types/kiosk.types";
import type { CheckoutItem } from "@/features/kiosk/types/kiosk-submission.types";
import { KioskRenderer } from "@/features/kiosk/components/kiosk-renderer";
import { KioskCartReview } from "@/features/kiosk/components/kiosk-cart-review";
import { KioskInvoiceDetails, type KioskBillingDetails } from "@/features/kiosk/components/kiosk-invoice-details";
import { computeLiveBuildScene, type LiveBuildScene, type KioskAnswerValue } from "@/features/kiosk/utils/kiosk-live-build";
import { buildKioskCheckoutFormData, buildKioskCheckoutPayload, captureLiveBuildSnapshot } from "@/features/kiosk/utils/kiosk-submission.builder";
import { toastError } from "@/shared/feedback/app-toast";
import { CheckCircle, AlertCircle, ShoppingCart, Download, ExternalLink } from "lucide-react";

export default function PublicKioskPage() {
  const params = useParams<{ id?: string | string[] }>();
  const searchParams = useSearchParams();
  const kioskId = Array.isArray(params.id) ? params.id[0] : params.id;
  const token = searchParams.get("token") || searchParams.get("organization_uuid");

  const [config, setConfig] = useState<KioskConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"configure" | "cart" | "invoice" | "submitted">("configure");
  const [answers, setAnswers] = useState<Record<string, KioskAnswerValue>>({});
  const [configuredData, setConfiguredData] = useState<{
    payload: { items?: CheckoutItem[] } | unknown;
    answers: Record<string, KioskAnswerValue>;
    scene: LiveBuildScene;
    renderedConfig?: KioskConfig;
    items?: CheckoutItem[];
  } | null>(null);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [cartTotals, setCartTotals] = useState<{ grandTotal: number; subtotal: number; deliveryFee: number; vat: number; quantity: number } | undefined>();
  const [submittedSnapshot, setSubmittedSnapshot] = useState<string | null>(null);

  // Restore saved draft answers from sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined" && kioskId) {
      try {
        const saved = sessionStorage.getItem(`kiosk_answers_${kioskId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            setAnswers(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to restore kiosk answers from storage", err);
      }
    }
  }, [kioskId]);

  // Persist answers to storage on change
  const handleAnswersChange = useCallback(
    (newAnswers: Record<string, any>) => {
      setAnswers(newAnswers);
      if (typeof window !== "undefined" && kioskId) {
        try {
          sessionStorage.setItem(`kiosk_answers_${kioskId}`, JSON.stringify(newAnswers));
        } catch (err) {
          console.error("Failed to save kiosk answers to storage", err);
        }
      }
    },
    [kioskId],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchKiosk = async () => {
      if (!kioskId) {
        setError("Invalid Kiosk ID.");
        setLoading(false);
        return;
      }

      if (!token) {
        setError("Missing token. Please use the link provided or open from the dashboard.");
        setLoading(false);
        return;
      }

      setLoading(true);
      const data = await getPublicKioskById(token, kioskId);

      if (!cancelled) {
        if (data) {
          setConfig(data);
        } else {
          setError("Kiosk not found or access denied.");
        }
        setLoading(false);
      }
    };

    void fetchKiosk();
    return () => {
      cancelled = true;
    };
  }, [kioskId, token]);

  // Transition from configure form -> cart review with computed scene & payload
  const handleConfigureSubmit = (
    payload: { items?: CheckoutItem[] } | unknown,
    meta?: { answers: Record<string, unknown>; scene: LiveBuildScene; renderedConfig?: KioskConfig },
  ) => {
    if (!config) return;
    const currentAnswers = (meta?.answers || answers) as Record<string, KioskAnswerValue>;
    const effectiveConfig = meta?.renderedConfig || config;
    const scene = meta?.scene || computeLiveBuildScene(effectiveConfig, currentAnswers);
    const prebuiltItems = (payload as { items?: CheckoutItem[] })?.items;
    setConfiguredData({
      payload,
      answers: currentAnswers,
      scene,
      renderedConfig: effectiveConfig,
      items: prebuiltItems,
    });
    setView("cart");
  };

  // From cart -> transition to invoice details tab (carry totals so prices stay in sync)
  const handleContinueToInvoice = (totals: { grandTotal: number; subtotal: number; deliveryFee: number; vat: number; quantity: number }) => {
    setCartTotals(totals);
    setView("invoice");
  };

  // Submit invoice and billing from invoice details tab
  const handleSubmitInvoiceAndPayment = async (billingDetails: KioskBillingDetails) => {
    if (!kioskId || !config || !configuredData) return;
    try {
      setIsSubmittingInvoice(true);

      // 1. Capture visual preview snapshot image
      let snapshotImage = "";
      try {
        snapshotImage = await captureLiveBuildSnapshot(configuredData.scene);
        if (!snapshotImage || snapshotImage.trim() === "" || snapshotImage === "data:,") {
          throw new Error("Visual snapshot capture produced an invalid image.");
        }
      } catch (snapErr) {
        console.error("Failed to capture snapshot image", snapErr);
        toastError("Failed to capture visual preview snapshot. Please try again.");
        setIsSubmittingInvoice(false);
        return;
      }

      // 2. Build multipart/form-data checkout payload with binary snapshot file Blob
      const activeConfig = configuredData.renderedConfig || config;
      const checkoutFormData = buildKioskCheckoutFormData({
        config: activeConfig,
        answers: configuredData.answers || answers,
        billingDetails,
        snapshotImage,
        organizationId: Number(config.organization_id || config.organization?.id || 1),
        kioskMachineId: Number(config.id || kioskId),
        items: configuredData.items || (configuredData.payload as { items?: CheckoutItem[] })?.items,
        scene: configuredData.scene,
      });

      // 3. Post to /api/v1/checkout/ as multipart/form-data
      await submitKioskCheckout(checkoutFormData);

      // 4. Auto-download snapshot image directly to user's computer on submission
      if (typeof window !== "undefined" && snapshotImage) {
        try {
          const downloadAnchor = document.createElement("a");
          downloadAnchor.href = snapshotImage;
          downloadAnchor.download = `kiosk-snapshot-${kioskId || "product"}.png`;
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          document.body.removeChild(downloadAnchor);
        } catch (downloadErr) {
          console.error("Failed to auto-download snapshot", downloadErr);
        }
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`kiosk_answers_${kioskId}`);
      }
      setSubmittedSnapshot(snapshotImage);
      setView("submitted");
    } catch (err) {
      console.error("Failed to submit checkout", err);
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#701524]" />
          <p className="text-sm font-medium text-slate-500">Loading product kiosk...</p>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center dark:bg-slate-950">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="size-6" />
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {error || "Failed to load kiosk"}
        </p>
      </div>
    );
  }

  // Submitted / Invoice success state
  if (view === "submitted") {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f4f5f7] px-4 py-8 text-center dark:bg-slate-950">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400">
          <CheckCircle className="size-8" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Invoice Generated Successfully
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Thank you! Your product configuration has been recorded and an invoice
          has been initiated.
        </p>

        {submittedSnapshot && (
          <div className="mt-6 max-w-sm w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-md dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Configured Snapshot Preview
            </p>
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <img
                src={submittedSnapshot}
                alt="Product snapshot"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <a
                href={submittedSnapshot}
                download={`kiosk-snapshot-${kioskId || "product"}.png`}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <Download className="size-3.5" />
                Download Snapshot (PNG)
              </a>
              <a
                href={submittedSnapshot}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ExternalLink className="size-3.5" />
                Open Full Size
              </a>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => {
              setAnswers({});
              setConfiguredData(null);
              setSubmittedSnapshot(null);
              setView("configure");
            }}
            className="rounded-md bg-[#701524] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5a101c] focus:outline-none focus:ring-2 focus:ring-[#701524] focus:ring-offset-2 transition cursor-pointer"
          >
            Configure Another Product
          </button>
        </div>
      </div>
    );
  }

  const cartCount = configuredData ? 1 : Object.keys(answers).length > 0 ? 1 : 0;

  return (
    <>
      {/* Configuration Form view — stays mounted so state and selections are never lost */}
      <div className={view === "configure" ? "min-h-screen w-full bg-slate-100 dark:bg-slate-950 flex flex-col lg:h-screen lg:overflow-hidden" : "hidden"}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 shrink-0 w-full bg-white dark:bg-slate-900 shadow-2xs">
          {/* Top Bar: Brand Logo & Cart Action */}
          <div className="flex h-14 w-full items-center justify-between border-b border-slate-200 px-4 sm:px-8 lg:px-12 dark:border-slate-800">
            <div className="flex items-center text-xl sm:text-2xl font-bold tracking-tight select-none">
              <span className="font-extrabold text-slate-900 dark:text-white">Sim</span>
              <span className="font-extrabold text-[#dc2626]">Ho</span>
            </div>

            <div className="flex items-center pr-1.5">
              <button
                type="button"
                onClick={() => {
                  if (configuredData) {
                    setView("cart");
                  } else if (config) {
                    const scene = computeLiveBuildScene(config, answers);
                    setConfiguredData({
                      payload: null,
                      answers,
                      scene,
                    });
                    setView("cart");
                  }
                }}
                className="relative inline-flex items-center gap-2 rounded-lg bg-[#701524] px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#5a101c] active:scale-[0.98] transition cursor-pointer"
              >
                <ShoppingCart className="size-4" />
                <span className="whitespace-nowrap">My Cart</span>
                <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-white text-[10px] sm:text-[11px] font-bold text-[#701524] border border-[#701524]/20 shadow-xs">
                  {cartCount}
                </span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0 w-full px-3 py-4 sm:px-6 sm:py-6 lg:min-h-0 lg:overflow-hidden lg:px-8 xl:px-12 2xl:px-16 flex flex-col">
          <KioskRenderer
            config={config}
            initialAnswers={answers}
            onAnswersChange={handleAnswersChange}
            onSubmit={handleConfigureSubmit}
            organizationUuid={token ?? undefined}
            scrollableLayout
            hideTitle
            submitButtonText="Add to Cart"
          />
        </div>
      </div>

      {/* Cart / Review Tab */}
      {view === "cart" && configuredData && (
        <div className="min-h-screen w-full">
          <KioskCartReview
            config={config}
            answers={answers}
            scene={configuredData.scene}
            payload={configuredData.payload as { total_price?: number; [key: string]: unknown } | undefined}
            onBack={() => setView("configure")}
            onContinueToInvoice={handleContinueToInvoice}
            isSubmitting={isSubmittingInvoice}
          />
        </div>
      )}

      {/* Invoice Details / Billing Tab */}
      {view === "invoice" && configuredData && (
        <div className="min-h-screen w-full">
          <KioskInvoiceDetails
            config={config}
            answers={answers}
            scene={configuredData.scene}
            payload={configuredData.payload as { total_price?: number; [key: string]: unknown } | undefined}
            cartTotals={cartTotals}
            onBack={() => setView("cart")}
            onSubmitInvoice={handleSubmitInvoiceAndPayment}
            isSubmitting={isSubmittingInvoice}
          />
        </div>
      )}
    </>
  );
}
