"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getPublicKioskById, submitKioskResponse } from "@/features/kiosk/api/kiosk.api";
import type { KioskConfig } from "@/features/kiosk/types/kiosk.types";
import { KioskRenderer } from "@/features/kiosk/components/kiosk-renderer";
import { KioskCartReview } from "@/features/kiosk/components/kiosk-cart-review";
import { computeLiveBuildScene, type LiveBuildScene } from "@/features/kiosk/utils/kiosk-live-build";
import { CheckCircle, AlertCircle, ShoppingCart } from "lucide-react";

export default function PublicKioskPage() {
  const params = useParams<{ id?: string | string[] }>();
  const searchParams = useSearchParams();
  const kioskId = Array.isArray(params.id) ? params.id[0] : params.id;
  const token = searchParams.get("token") || searchParams.get("organization_uuid");

  const [config, setConfig] = useState<KioskConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"configure" | "cart" | "submitted">("configure");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [configuredData, setConfiguredData] = useState<{
    payload: any;
    answers: Record<string, any>;
    scene: LiveBuildScene;
  } | null>(null);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

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
    payload: any,
    meta?: { answers: Record<string, any>; scene: LiveBuildScene },
  ) => {
    if (!config) return;
    const currentAnswers = meta?.answers || answers;
    const scene = meta?.scene || computeLiveBuildScene(config, currentAnswers);
    setConfiguredData({
      payload,
      answers: currentAnswers,
      scene,
    });
    setView("cart");
  };

  // Submit invoice from cart review tab
  const handleContinueToInvoice = async () => {
    if (!kioskId || !configuredData) return;
    try {
      setIsSubmittingInvoice(true);
      await submitKioskResponse({
        ...configuredData.payload,
        form_id: Number(kioskId),
      });
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`kiosk_answers_${kioskId}`);
      }
      setView("submitted");
    } catch (err) {
      console.error("Failed to submit kiosk invoice", err);
      alert("Failed to submit response. Please try again.");
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
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f4f5f7] px-4 text-center dark:bg-slate-950">
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
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={() => {
              setAnswers({});
              setConfiguredData(null);
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

  return (
    <>
      {/* Configuration Form view — stays mounted so state and selections are never lost */}
      <div className={view === "configure" ? "min-h-screen w-full bg-slate-100 dark:bg-slate-950 flex flex-col lg:h-screen lg:overflow-hidden" : "hidden"}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">

          <div className="flex items-center text-2xl font-bold tracking-tight select-none">
            <span className="font-extrabold text-slate-900 dark:text-white">Sim</span>
            <span className="font-extrabold text-[#dc2626]">Ho</span>
          </div>

          <div className="flex items-center justify-end w-24 sm:w-28">
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
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-[#701524] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#5a101c] active:scale-[0.98] transition cursor-pointer"
            >
              <ShoppingCart className="size-3.5 sm:size-4" />
              <span className="whitespace-nowrap">My Cart</span>
              <span className="flex size-4.5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#701524] leading-none">
                {configuredData ? 1 : Object.keys(answers).length > 0 ? 1 : 0}
              </span>
            </button>
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
            onBack={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              }
            }}
            submitButtonText="Configure Product"
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
            payload={configuredData.payload}
            onBack={() => setView("configure")}
            onContinueToInvoice={handleContinueToInvoice}
            isSubmitting={isSubmittingInvoice}
          />
        </div>
      )}
    </>
  );
}
