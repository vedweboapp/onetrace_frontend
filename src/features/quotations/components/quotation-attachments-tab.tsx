"use client";

import * as React from "react";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  updateQuotationAttachments,
  type QuotationAttachmentWriteRef,
} from "@/features/quotations/api/quotation.api";
import type { QuotationAttachment, QuotationDetail } from "@/features/quotations/types/quotation.types";
import {
  hasQuotationAttachment,
  resolveQuotationAttachmentLabel,
  resolveQuotationAttachmentUrl,
} from "@/features/quotations/utils/quotation-attachment-display.util";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type AttachmentDraft = {
  key: string;
  id?: number;
  file?: File;
  file_name?: string;
  file_url?: string;
  removed?: boolean;
};

function nextAttachmentKey(): string {
  return `att-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mapApiAttachments(rows: QuotationAttachment[] | null | undefined): AttachmentDraft[] {
  if (!rows?.length) return [];
  return rows.filter(hasQuotationAttachment).map((row) => ({
    key: nextAttachmentKey(),
    id: row.id,
    file_name: resolveQuotationAttachmentLabel(row),
    file_url: resolveQuotationAttachmentUrl(row) ?? undefined,
  }));
}

function draftLabel(draft: AttachmentDraft): string {
  if (draft.file?.name) return draft.file.name;
  if (draft.file_name?.trim()) return draft.file_name.trim();
  return draft.id != null ? `Attachment #${draft.id}` : "Attachment";
}

function draftUrl(draft: AttachmentDraft): string | null {
  return draft.file_url?.trim() || null;
}

function buildAttachmentRefs(drafts: AttachmentDraft[]): QuotationAttachmentWriteRef[] {
  const out: QuotationAttachmentWriteRef[] = [];
  for (const d of drafts) {
    if (d.removed && d.id != null) {
      out.push({ id: d.id, is_deleted: true });
      continue;
    }
    if (!d.removed && d.file instanceof File) {
      out.push({ file: d.file });
    }
  }
  return out;
}

export type QuotationAttachmentsTabProps = {
  detail: QuotationDetail;
  onSaved: () => void | Promise<void>;
};

export function QuotationAttachmentsTab({ detail, onSaved }: QuotationAttachmentsTabProps) {
  const t = useTranslations("Dashboard.quotations.attachmentsTab");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = React.useState<AttachmentDraft[]>(() =>
    mapApiAttachments(detail.attachments),
  );
  const [saving, setSaving] = React.useState(false);
  const objectUrlsRef = React.useRef<string[]>([]);

  React.useEffect(() => {
    setDrafts(mapApiAttachments(detail.attachments));
  }, [detail.id, detail.attachments]);

  React.useEffect(() => {
    return () => {
      for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
      objectUrlsRef.current = [];
    };
  }, []);

  const visible = drafts.filter((d) => !d.removed);
  const dirty = React.useMemo(() => {
    const refs = buildAttachmentRefs(drafts);
    return refs.length > 0;
  }, [drafts]);

  function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    const next: AttachmentDraft[] = Array.from(files).map((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      return {
        key: nextAttachmentKey(),
        file,
        file_name: file.name,
        file_url: url,
      };
    });
    setDrafts((prev) => [...prev, ...next]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeDraft(key: string) {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        if (d.id != null) return { ...d, removed: true };
        return { ...d, removed: true, file: undefined };
      }),
    );
  }

  async function save() {
    const refs = buildAttachmentRefs(drafts);
    if (refs.length === 0) return;
    setSaving(true);
    try {
      await updateQuotationAttachments(detail.id, refs);
      toastSuccess(t("savedToast"));
      await onSaved();
    } catch (error) {
      toastApiError(error, t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{t("title")}</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            disabled={saving}
            onChange={(e) => onFilesSelected(e.target.files)}
          />
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-3.5" aria-hidden />
            {t("addFiles")}
          </AppButton>
          <AppButton type="button" variant="primary" size="sm" loading={saving} disabled={!dirty || saving} onClick={() => void save()}>
            {t("save")}
          </AppButton>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
          <Paperclip className="mx-auto size-8 text-slate-300 dark:text-slate-600" aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("emptyDescription")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {visible.map((draft) => {
            const href = draftUrl(draft);
            const label = draftLabel(draft);
            const isNew = draft.file instanceof File;
            return (
              <li
                key={draft.key}
                className="flex items-center gap-3 bg-white px-3 py-2.5 dark:bg-slate-950"
              >
                <Paperclip className="size-4 shrink-0 text-slate-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{label}</p>
                  {isNew ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("pendingUpload")}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={draft.file ? label : undefined}
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
                    disabled={saving}
                    onClick={() => removeDraft(draft.key)}
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
      )}
    </div>
  );
}
