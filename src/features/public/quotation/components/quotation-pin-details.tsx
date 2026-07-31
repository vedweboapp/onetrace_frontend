"use client";

import { useEffect, useMemo, useReducer } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  loadQuotationScopePinDetails,
  type QuotationScopePinDetailPayload,
} from "@/features/quotations/utils/quotation-composite-scope-pins.util";
import { fetchPublicPinDetails } from "@/features/public/quotation/api/public-pin.api";

const DrawingPinPreviewModal = dynamic(
  () => import("./quotation-drawing-pin-preview-modal").then((mod) => mod.DrawingPinPreviewModal),
  { ssr: false },
);

type PublicPinPayloadState = {
  payload: QuotationScopePinDetailPayload | null;
  loading: boolean;
  error: string | null;
};

type PublicPinPayloadAction =
  | { type: "start" }
  | { type: "success"; payload: QuotationScopePinDetailPayload }
  | { type: "failure"; error: string }
  | { type: "reset" };

function publicPinPayloadReducer(state: PublicPinPayloadState, action: PublicPinPayloadAction): PublicPinPayloadState {
  switch (action.type) {
    case "start":
      return { payload: null, loading: true, error: null };
    case "success":
      return { payload: action.payload, loading: false, error: null };
    case "failure":
      return { payload: null, loading: false, error: action.error };
    case "reset":
      return { payload: null, loading: false, error: null };
    default:
      return state;
  }
}

export function QuotationPinDetails() {
  const t = useTranslations("Public.quotation");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? searchParams.get("pinDetailsKey");
  const [payloadState, dispatchPayloadState] = useReducer(publicPinPayloadReducer, {
    payload: null,
    loading: true,
    error: null,
  });

  const numericPinId = useMemo(() => Number(token), [token]);
  const isNumericToken = useMemo(
    () =>
      typeof token === "string" &&
      token.trim().length > 0 &&
      Number.isFinite(numericPinId) &&
      String(numericPinId) === token.trim(),
    [token, numericPinId],
  );

  const storedPayload = useMemo(() => {
    if (!token || isNumericToken) return null;
    return loadQuotationScopePinDetails(token);
  }, [token, isNumericToken]);

  const payload = useMemo(() => {
    if (!token) return null;
    return isNumericToken ? payloadState.payload : storedPayload;
  }, [token, isNumericToken, payloadState.payload, storedPayload]);

  const loading = useMemo(() => {
    return isNumericToken ? payloadState.loading : false;
  }, [isNumericToken, payloadState.loading]);

  useEffect(() => {
    if (!token || !isNumericToken) return;

    let cancelled = false;
    dispatchPayloadState({ type: "start" });

    fetchPublicPinDetails(numericPinId)
      .then((data) => {
        if (cancelled) return;
        dispatchPayloadState({ type: "success", payload: data });
      })
      .catch(() => {
        if (cancelled) return;
        dispatchPayloadState({ type: "failure", error: t("notFound") });
      });

    return () => {
      cancelled = true;
    };
  }, [token, numericPinId, isNumericToken, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{t("eyebrow")}</p>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{t("eyebrow")}</p>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("notFound")}</p>
        </div>
      </div>
    );
  }

  const selectedPin =
    payload.selectedPin ||
    payload.plots?.flatMap((p) => p.pins).find((p) => p.id === numericPinId) ||
    payload.plots?.flatMap((p) => p.pins)[0] ||
    null;

  const plots = payload.plots || [];
  const drawingFile = payload.drawingFile || "";
  const drawingName = payload.drawingName || payload.title || t("title");

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-2 md:p-12 overflow-hidden">
      <div className="flex flex-1 flex-col h-full w-full gap-2 overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">
              Pin #{selectedPin?.id ?? numericPinId} Preview
            </h1>
            {drawingName && (
              <span className="text-xs md:text-sm font-normal text-slate-500">
                ({drawingName})
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 h-full w-full overflow-hidden">
          <DrawingPinPreviewModal
            open={true}
            onClose={() => undefined}
            pin={selectedPin}
            plots={plots}
            drawingFile={drawingFile}
            drawingName={drawingName}
            embedded={true}
            hideFormRow={true}
          />
        </div>
      </div>
    </div>
  );
}
