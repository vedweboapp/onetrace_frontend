"use client";

import * as React from "react";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { updateQuotationAttachments } from "@/features/quotations/api/quotation.api";
import type { QuotationAttachment, QuotationDetail } from "@/features/quotations/types/quotation.types";
import {
  hasQuotationAttachment,
  resolveQuotationAttachmentLabel,
  resolveQuotationAttachmentUrl,
} from "@/features/quotations/utils/quotation-attachment-display.util";
import {
  detailTabBodyClassName,
  detailTabSectionClassName,
  detailTabToolbarClassName,
} from "@/shared/components/layout/detail-tab-layout";
import { DetailTabListShell } from "@/shared/components/layout/detail-tab-list-shell";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, DashboardEmptyState } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type AttachmentRow = {
  key: string;
  id?: number;
  file_name: string;
  file_url?: string;
};

function nextAttachmentKey(): string {
  return `att-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mapApiAttachments(rows: QuotationAttachment[] | null | undefined): AttachmentRow[] {
  if (!rows?.length) return [];
  return rows.filter(hasQuotationAttachment).map((row) => ({
    key: row.id != null ? `id-${row.id}` : nextAttachmentKey(),
    id: row.id,
    file_name: resolveQuotationAttachmentLabel(row),
    file_url: resolveQuotationAttachmentUrl(row) ?? undefined,
  }));
}

export type QuotationAttachmentsTabProps = {
  detail: QuotationDetail;
  onSaved: () => void | Promise<void>;
};

export function QuotationAttachmentsTab({ detail, onSaved }: QuotationAttachmentsTabProps) {
  const t = useTranslations("Dashboard.quotations.attachmentsTab");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [rows, setRows] = React.useState<AttachmentRow[]>(() => mapApiAttachments(detail.attachments));
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setRows(mapApiAttachments(detail.attachments));
  }, [detail.id, detail.attachments]);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length || busy) return;
    const list = Array.from(files);
    if (inputRef.current) inputRef.current.value = "";
    setBusy(true);
    try {
      await updateQuotationAttachments(
        detail.id,
        list.map((file) => ({ file })),
      );
      toastSuccess(t("uploadedToast"));
      await onSaved();
    } catch (error) {
      toastApiError(error, t("uploadError"));
    } finally {
      setBusy(false);
    }
  }

  async function removeAttachment(row: AttachmentRow) {
    if (busy || row.id == null) return;
    setBusy(true);
    try {
      await updateQuotationAttachments(detail.id, [{ id: row.id, is_deleted: true }]);
      toastSuccess(t("deletedToast"));
      await onSaved();
    } catch (error) {
      toastApiError(error, t("deleteError"));
    } finally {
      setBusy(false);
    }
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      multiple
      className="sr-only"
      disabled={busy}
      onChange={(e) => void uploadFiles(e.target.files)}
    />
  );

  const addFilesButton = (
    <AppButton
      type="button"
      variant="secondary"
      size="sm"
      loading={busy}
      disabled={busy}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="size-3.5" aria-hidden />
      {t("addFiles")}
    </AppButton>
  );

  return (
    <div className={detailTabSectionClassName}>
      {fileInput}
      <DetailTabListShell
        loading={false}
        loadError={null}
        isEmpty={rows.length === 0}
        toolbar={
          <div className={detailTabToolbarClassName}>
            <div className="min-w-0 flex-1 text-left">
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {t("title")}
              </h2>
              <p className="mt-0.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">{addFilesButton}</div>
          </div>
        }
        loadingFallback={null}
        emptyFallback={
          <DashboardEmptyState
            fill
            iconName="quotations"
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={addFilesButton}
          />
        }
      >
        <div className={detailTabBodyClassName}>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            {rows.map((row) => {
              const href = row.file_url?.trim() || null;
              const label = row.file_name;
              return (
                <li
                  key={row.key}
                  className="flex items-center gap-3 bg-white px-3 py-2.5 dark:bg-slate-950"
                >
                  <Paperclip className="size-4 shrink-0 text-slate-400" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{label}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "inline-flex size-8 items-center justify-center rounded-lg",
                          "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                        )}
                        aria-label={t("downloadAria", { name: label })}
                        title={t("download")}
                      >
                        <Download className="size-4" aria-hidden />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy || row.id == null}
                      onClick={() => void removeAttachment(row)}
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-lg",
                        "text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400",
                        "disabled:opacity-50",
                      )}
                      aria-label={t("removeAria", { name: label })}
                      title={t("remove")}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </DetailTabListShell>
    </div>
  );
}
