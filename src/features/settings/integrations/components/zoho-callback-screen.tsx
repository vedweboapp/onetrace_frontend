"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { completeZohoIntegration } from "@/features/settings/integrations/api/integration.api";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, SurfaceShell } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

function readCallbackParam(searchParams: URLSearchParams, key: string): string {
  return searchParams.get(key)?.trim() ?? "";
}

export function ZohoCallbackScreen() {
  const t = useTranslations("Dashboard.integrations.zohoCallback");
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = readCallbackParam(searchParams, "code");
  const state = readCallbackParam(searchParams, "state");
  const accountsServer = readCallbackParam(searchParams, "accounts-server");

  const [pullHistoricalData, setPullHistoricalData] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const missingParams = !code || !state || !accountsServer;

  async function handleFinish() {
    if (missingParams) return;
    setSubmitting(true);
    try {
      const message = await completeZohoIntegration({
        code,
        state,
        accountsServer,
        pullHistoricalData,
      });
      toastSuccess(message);
      router.replace(routes.dashboard.settingsZohoKeyMapping);
    } catch {
      toastError(t("finishError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 py-6">


      <SurfaceShell className="rounded-xl">
        <div className="space-y-6 p-4 sm:p-6">
          {missingParams ? (
            <p className="text-sm text-red-600 dark:text-red-400">{t("missingParams")}</p>
          ) : (
            <>
              <div className="space-y-1">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t("description")}</p>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t("pullHistoricalData")}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {t("pullHistoricalDataHint")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pullHistoricalData}
                  aria-label={t("pullHistoricalData")}
                  disabled={submitting}
                  onClick={() => setPullHistoricalData((v) => !v)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#111111)]/30",
                    pullHistoricalData
                      ? "bg-[color:var(--dash-accent,#111111)]"
                      : "bg-slate-200 dark:bg-slate-700",
                    submitting ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
                      pullHistoricalData ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={submitting}
                  onClick={() => router.replace(routes.dashboard.settingsIntegrations)}
                >
                  {t("cancel")}
                </AppButton>
                <AppButton
                  type="button"
                  variant="primary"
                  size="sm"
                  loading={submitting}
                  onClick={() => void handleFinish()}
                >
                  {t("finish")}
                </AppButton>
              </div>
            </>
          )}
        </div>
      </SurfaceShell>
    </div>
  );
}
