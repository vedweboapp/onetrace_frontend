"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { downloadQrCodesCsv } from "@/features/qr-codes/api/qr-code.api";
import type { QrCodeGenerateResult } from "@/features/qr-codes/types/qr-code.types";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal } from "@/shared/ui";

type Props = {
  open: boolean;
  result: QrCodeGenerateResult | null;
  onClose: () => void;
};

export function QrCodeGenerateResultModal({ open, result, onClose }: Props) {
  const t = useTranslations("Dashboard.qrCodes");
  const locale = useLocale();
  const [downloading, setDownloading] = React.useState(false);

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const batch = result?.batch ?? null;
  const codes = result?.qr_codes ?? [];
  const quantity = batch?.quantity ?? codes.length;

  async function handleDownloadCsv() {
    if (!batch || batch.id <= 0) return;
    setDownloading(true);
    try {
      await downloadQrCodesCsv(batch.id, batch.batch_number);
      toastSuccess(t("generate.result.downloadSuccess"));
    } catch (error) {
      toastApiError(error, t("generate.result.downloadError"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <AppModal
      open={open}
      onClose={() => (!downloading ? onClose() : undefined)}
      title={t("generate.result.title")}
      titleId="qr-generate-result-title"
      closeOnBackdrop={!downloading}
      isBusy={downloading}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="sm" disabled={downloading} onClick={onClose}>
            {t("generate.result.close")}
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            loading={downloading}
            disabled={!batch || batch.id <= 0}
            onClick={() => void handleDownloadCsv()}
          >
            {t("generate.result.downloadCsv")}
          </AppButton>
        </>
      }
    >
      {batch ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label={t("generate.result.batchNumber")} value={batch.batch_number || "—"} />
            <DetailCard label={t("generate.result.quantity")} value={String(quantity)} />
            <DetailCard
              label={t("generate.result.createdAt")}
              value={
                batch.created_at
                  ? (() => {
                      const d = new Date(batch.created_at);
                      return Number.isNaN(d.getTime()) ? batch.created_at : dateFmt.format(d);
                    })()
                  : "—"
              }
            />
            <DetailCard
              label={t("generate.result.createdBy")}
              value={
                batch.created_by?.name?.trim() ||
                batch.created_by?.username?.trim() ||
                batch.created_by?.email?.trim() ||
                "—"
              }
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {t("generate.result.codesCount", { count: quantity })}
          </div>
        </div>
      ) : null}
    </AppModal>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
