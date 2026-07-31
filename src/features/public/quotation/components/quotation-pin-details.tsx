"use client";

import { useEffect, useMemo, useReducer } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  loadQuotationScopePinDetails,
  type QuotationScopePinDetailPayload,
} from "@/features/quotations/utils/quotation-composite-scope-pins.util";
import { fetchPublicPinDetails } from "@/features/public/quotation/api/public-pin.api";
import { formatMoneyDisplay } from "@/features/quotations/utils/quotation-level-pricing.util";
import {
  getOrCreateLevelSnapshot,
  releaseLevelSnapshot,
  type LevelSnapshot,
} from "@/shared/utils/pdf-snapshot.util";
import { resolveDrawingFileUrl } from "@/features/projects/utils/drawing-file-url";

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

type DrawingPreviewState = {
  snapshot: LevelSnapshot | null;
  loading: boolean;
  error: string | null;
  currentUrl: string | null;
};

type DrawingPreviewAction =
  | { type: "start"; url: string }
  | { type: "success"; snapshot: LevelSnapshot; url: string }
  | { type: "failure"; error: string; url: string }
  | { type: "reset" };

function drawingPreviewReducer(state: DrawingPreviewState, action: DrawingPreviewAction): DrawingPreviewState {
  switch (action.type) {
    case "start":
      return { snapshot: null, loading: true, error: null, currentUrl: action.url };
    case "success":
      return { snapshot: action.snapshot, loading: false, error: null, currentUrl: action.url };
    case "failure":
      return { snapshot: null, loading: false, error: action.error, currentUrl: action.url };
    case "reset":
      return { snapshot: null, loading: false, error: null, currentUrl: null };
    default:
      return state;
  }
}

export function QuotationPinDetails() {
  const t = useTranslations("Public.quotation");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? searchParams.get("pinDetailsKey");
  const [payloadState, dispatchPayloadState] = useReducer(publicPinPayloadReducer, {
    payload: null,
    loading: true,
    error: null,
  });
  const [drawingState, dispatchDrawingState] = useReducer(drawingPreviewReducer, {
    snapshot: null,
    loading: false,
    error: null,
    currentUrl: null,
  });
  const loc = locale === "es" ? "es" : "en";

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

  const drawingFileUrl = payload?.drawingFile ? resolveDrawingFileUrl(payload.drawingFile) ?? null : null;

  const drawingSnapshot = drawingState.snapshot;
  const drawingLoading = drawingState.loading && drawingState.currentUrl === drawingFileUrl;
  const drawingError = drawingState.currentUrl === drawingFileUrl ? drawingState.error : null;

  useEffect(() => {
    if (!drawingFileUrl) {
      dispatchDrawingState({ type: "reset" });
      return;
    }

    let cancelled = false;
    dispatchDrawingState({ type: "start", url: drawingFileUrl });

    getOrCreateLevelSnapshot(drawingFileUrl)
      .then((snapshot) => {
        if (cancelled) return;
        dispatchDrawingState({ type: "success", snapshot, url: drawingFileUrl });
      })
      .catch(() => {
        if (cancelled) return;
        dispatchDrawingState({ type: "failure", error: t("pinPreviewUnavailable"), url: drawingFileUrl });
      });

    return () => {
      cancelled = true;
      if (drawingFileUrl) {
        releaseLevelSnapshot(drawingFileUrl);
      }
    };
  }, [drawingFileUrl, t]);

  const pinRow = useMemo(
    () =>
      payload?.rows.find(
        (row) => typeof row.x_coordinate === "number" && typeof row.y_coordinate === "number",
      ) ?? null,
    [payload?.rows],
  );

  const pinCoordinates = useMemo(() => {
    if (!pinRow) return null;
    const x = pinRow.x_coordinate;
    const y = pinRow.y_coordinate;
    if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) {
      return null;
    }
    return {
      left: `${Math.max(0, Math.min(100, x))}%`,
      top: `${Math.max(0, Math.min(100, y))}%`,
    } as const;
  }, [pinRow]);

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

  const totalQuantity = payload.rows.reduce((sum, row) => sum + row.quantity, 0);
  const totalAmount = payload.rows.reduce((sum, row) => sum + row.pins_total, 0);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{t("eyebrow")}</p>
          <h1 className="mt-2 text-2xl font-semibold">{payload.title || t("title")}</h1>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t("totalQuantity")}</p>
              <p className="mt-2 text-lg font-semibold">{totalQuantity}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t("totalAmount")}</p>
              <p className="mt-2 text-lg font-semibold">{formatMoneyDisplay(totalAmount, loc)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t("context")}</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                {[payload.sectionLabel, payload.plotLabel].filter(Boolean).join(" · ") || t("shared")}
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="text-lg font-semibold">{t("summary")}</h2>
          </div>
          <div className="grid gap-6 p-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative min-h-65 overflow-hidden rounded-lg border border-dashed border-slate-300 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.16),transparent_60%)] p-4 dark:border-slate-700">
              {drawingLoading && !drawingSnapshot && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/85 dark:bg-slate-950/85">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("loading")}</span>
                </div>
              )}
              {drawingError && !drawingLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/85 dark:bg-slate-950/85">
                  <span className="rounded-full border border-dashed border-slate-300 bg-white/80 px-3 py-1 text-xs text-slate-500 dark:bg-slate-950/80 dark:text-slate-400">
                    {drawingError}
                  </span>
                </div>
              )}
              {drawingSnapshot ? (
                <div className="relative mx-auto flex w-full max-h-144 justify-center overflow-hidden rounded-lg bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={drawingSnapshot.objectUrl}
                    alt={t("drawingPreviewAlt")}
                    className="w-full max-w-full object-contain"
                    style={{ display: "block" }}
                  />
                  {pinCoordinates ? (
                    <div
                      className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sky-600/90 shadow-lg"
                      style={pinCoordinates}
                      aria-label={t("pinMarker")}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <span className="rounded-full border border-dashed border-slate-300 bg-white/80 px-3 py-1 text-xs text-slate-500 dark:bg-slate-950/80 dark:text-slate-400">
                      {t("pinPreviewUnavailable")}
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t("drawingHint")}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{t("selectedPin")}</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <p>
                  <span className="font-semibold">{t("product")}: </span>
                  {payload.rows[0]?.name || "—"}
                </p>
                <p>
                  <span className="font-semibold">{t("quantity")}: </span>
                  {payload.rows[0]?.quantity ?? 0}
                </p>
                <p>
                  <span className="font-semibold">{t("unitPrice")}: </span>
                  {payload.rows[0] ? formatMoneyDisplay(payload.rows[0].selling_price, loc) : "—"}
                </p>
                <p>
                  <span className="font-semibold">{t("lineTotal")}: </span>
                  {payload.rows[0] ? formatMoneyDisplay(payload.rows[0].pins_total, loc) : "—"}
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950/70">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t("product")}</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t("quantity")}</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t("unitPrice")}</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t("lineTotal")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {payload.rows.map((row, index) => (
                  <tr key={`${row.pin_id ?? "draft"}-${row.pins_order ?? index}`}>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{row.name || "—"}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{row.quantity}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{formatMoneyDisplay(row.selling_price, loc)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{formatMoneyDisplay(row.pins_total, loc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
