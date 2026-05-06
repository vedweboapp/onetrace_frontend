"use client";

import * as React from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createDrawing } from "@/features/projects/api/drawing.api";
import { toastSuccess } from "@/shared/feedback/app-toast";
import {
  AppButton,
  AppModal,
  FieldLabel,
  fieldErrorTextClassName,
  surfaceInputClassName,
} from "@/shared/ui";

function capitalizeFirstLetter(value: string): string {
  if (!value) return value;
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  const rounded = idx === 0 ? Math.round(value) : value < 10 ? Number(value.toFixed(1)) : Math.round(value);
  return `${rounded} ${units[idx]}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: number;
  suggestedOrder: number;
  onCreated: () => void;
};

export function DrawingUploadModal({
  open,
  onClose,
  projectId,
  suggestedOrder,
  onCreated,
}: Props) {
  const t = useTranslations("Dashboard.projects.drawings.modal");

  const fileId = React.useId();

  const [rows, setRows] = React.useState<Array<{ id: string; file: File; name: string; touched: boolean }>>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [fileTouched, setFileTouched] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);

  const hasNameErrors = rows.some((r) => r.touched && r.name.trim().length === 0);
  const fileInvalid = fileTouched && rows.length === 0;

  function toNameFromFile(file: File): string {
    const base = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
    return capitalizeFirstLetter(base || file.name);
  }

  const applyFiles = React.useCallback((incoming: File[]) => {
    if (incoming.length === 0) return;
    setRows(
      incoming.map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        name: toNameFromFile(file),
        touched: false,
      })),
    );
    setFileTouched(true);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFileTouched(true);
    setRows((prev) => prev.map((r) => ({ ...r, touched: true })));
    if (rows.length === 0) return;
    if (rows.some((r) => r.name.trim().length === 0)) return;

    setSubmitting(true);
    try {
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i]!;
        await createDrawing(projectId, {
          name: row.name.trim(),
          order: suggestedOrder + i,
          file: row.file,
        });
      }
      toastSuccess(t("createdToast"));
      onCreated();
      onClose();
    } catch {
      /* errors surfaced by axios interceptor toast */
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseAttempt() {
    if (!submitting) onClose();
  }

  return (
    <AppModal
      open={open}
      onClose={handleCloseAttempt}
      title={t("title")}
      size="lg"
      showCloseButton
      closeOnBackdrop={!submitting}
      isBusy={submitting}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="md" disabled={submitting} onClick={handleCloseAttempt}>
            {t("cancel")}
          </AppButton>
          <AppButton
            type="submit"
            form="drawing-upload-form"
            variant="primary"
            size="md"
            loading={submitting}
          >
            {t("submit")}
          </AppButton>
        </>
      }
    >
      <form id="drawing-upload-form" className="space-y-5" onSubmit={(e) => void submit(e)}>
        <div>
          <FieldLabel required>{t("file")}</FieldLabel>
          <label
            htmlFor={fileId}
            onDragOver={(e) => {
              e.preventDefault();
              if (!submitting) setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (submitting) return;
              applyFiles(Array.from(e.dataTransfer.files ?? []));
            }}
            className={[
              "mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragActive
                ? "border-slate-500 bg-slate-100 dark:border-slate-500 dark:bg-slate-800/70"
                : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600 dark:hover:bg-slate-900",
            ].join(" ")}
          >
            <UploadCloud className="size-8 text-slate-500 dark:text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("fileHint")}</p>
            <input
              id={fileId}
              type="file"
              multiple
              disabled={submitting}
              accept=".pdf,application/pdf,image/*"
              onBlur={() => setFileTouched(true)}
              onChange={(e) => applyFiles(Array.from(e.target.files ?? []))}
              className="sr-only"
            />
          </label>
          {fileInvalid ? <p className={fieldErrorTextClassName}>{t("fileError")}</p> : null}
        </div>

        {rows.length > 0 ? (
          <div className="space-y-3">
            {rows.map((row, idx) => {
              const rowInvalid = row.touched && row.name.trim().length === 0;
              return (
                <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{row.file.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(row.file.size)}</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                      aria-label={`Remove ${row.file.name}`}
                      disabled={submitting}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
                      <FileText className="size-4 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <FieldLabel htmlFor={`drawing-name-${row.id}`} required>
                        {t("name")} {idx + 1}
                      </FieldLabel>
                      <input
                        id={`drawing-name-${row.id}`}
                        type="text"
                        autoComplete="off"
                        value={row.name}
                        onChange={(e) => {
                          const value = capitalizeFirstLetter(e.target.value);
                          setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, name: value } : r)));
                        }}
                        onBlur={() => {
                          setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, touched: true } : r)));
                        }}
                        disabled={submitting}
                        placeholder={t("namePlaceholder")}
                        className={surfaceInputClassName}
                      />
                    </div>
                  </div>
                  {rowInvalid ? <p className={fieldErrorTextClassName}>{t("nameError")}</p> : null}
                </div>
              );
            })}
            {hasNameErrors ? <p className={fieldErrorTextClassName}>{t("nameError")}</p> : null}
          </div>
        ) : null}
      </form>
    </AppModal>
  );
}
