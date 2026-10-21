"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal, CheckmarkSelect } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { autoMapColumns } from "./auto-map.util";
import {
  fetchModuleImportStatus,
  isImportStatusSuccess,
  isImportStatusTerminal,
  isModuleImportQueued,
  postModuleImport,
} from "./import.api";
import {
  IMPORT_ACCEPT,
  IMPORT_MAX_BYTES,
  isSupportedImportFile,
  parseImportFile,
} from "./parse-import-file.util";
import type {
  ImportColumnMapping,
  ModuleImportConfig,
  ModuleImportResult,
  ModuleImportStatusResult,
  ParsedImportFile,
} from "./types";

type Step = "upload" | "map" | "progress" | "result";

type Props = {
  open: boolean;
  onClose: () => void;
  config: ModuleImportConfig;
  onSuccess?: (result: ModuleImportResult) => void;
};

const IMPORT_STATUS_POLL_MS = 1500;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clampPercent(value: number | undefined | null): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => resolve(), ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function ImportWizard({ open, onClose, config, onSuccess }: Props) {
  const t = useTranslations("Dashboard.import");
  const tActions = useTranslations("Dashboard.common.actions");

  const [step, setStep] = React.useState<Step>("upload");
  const [dragActive, setDragActive] = React.useState(false);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [parsing, setParsing] = React.useState(false);
  const [parsed, setParsed] = React.useState<ParsedImportFile | null>(null);
  /** file column → module field key ("" = skip) */
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [importing, setImporting] = React.useState(false);
  const [progress, setProgress] = React.useState<ModuleImportStatusResult | null>(null);
  const [result, setResult] = React.useState<ModuleImportResult | null>(null);
  const [resultFailed, setResultFailed] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pollAbortRef = React.useRef<AbortController | null>(null);

  const stopPolling = React.useCallback(() => {
    pollAbortRef.current?.abort();
    pollAbortRef.current = null;
  }, []);

  const resetState = React.useCallback(() => {
    stopPolling();
    setStep("upload");
    setDragActive(false);
    setParseError(null);
    setParsing(false);
    setParsed(null);
    setMapping({});
    setImporting(false);
    setProgress(null);
    setResult(null);
    setResultFailed(false);
    if (inputRef.current) inputRef.current.value = "";
  }, [stopPolling]);

  React.useEffect(() => {
    if (!open) {
      stopPolling();
      return;
    }
    resetState();
  }, [open, resetState, stopPolling]);

  React.useEffect(() => () => stopPolling(), [stopPolling]);

  const requiredFields = React.useMemo(
    () => config.fields.filter((f) => f.required),
    [config.fields],
  );

  const mappedModuleKeys = React.useMemo(() => {
    const keys = new Set<string>();
    for (const v of Object.values(mapping)) {
      if (v) keys.add(v);
    }
    return keys;
  }, [mapping]);

  const missingRequired = React.useMemo(
    () => requiredFields.filter((f) => !mappedModuleKeys.has(f.key)),
    [requiredFields, mappedModuleKeys],
  );

  const allFieldOptions = React.useMemo(
    () => [
      { value: "", label: t("doNotImport") },
      ...config.fields.map((f) => ({
        value: f.key,
        label: f.required ? `${f.label} *` : f.label,
      })),
    ],
    [config.fields, t],
  );

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setParseError(null);

    if (file.size > IMPORT_MAX_BYTES) {
      setParseError(t("errors.tooLarge"));
      return;
    }
    if (!isSupportedImportFile(file)) {
      setParseError(t("errors.unsupported"));
      return;
    }

    setParsing(true);
    try {
      const next = await parseImportFile(file);
      if (next.columns.length === 0) {
        setParseError(t("errors.empty"));
        return;
      }
      setParsed(next);
      setMapping(autoMapColumns(next.columns, config.fields));
      setStep("map");
    } catch {
      setParseError(t("errors.parseFailed"));
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    void handleFile(e.dataTransfer.files?.[0]);
  }

  function setColumnMapping(fileColumn: string, moduleField: string) {
    setMapping((prev) => {
      const next = { ...prev };
      // Enforce 1:1 — clear other columns using the same module field
      if (moduleField) {
        for (const [col, key] of Object.entries(next)) {
          if (col !== fileColumn && key === moduleField) next[col] = "";
        }
      }
      next[fileColumn] = moduleField;
      return next;
    });
  }

  function handleAutoMap() {
    if (!parsed) return;
    setMapping(autoMapColumns(parsed.columns, config.fields));
  }

  function handleResetMapping() {
    if (!parsed) return;
    const cleared: Record<string, string> = {};
    for (const col of parsed.columns) cleared[col] = "";
    setMapping(cleared);
  }

  function buildPayloadMapping(): ImportColumnMapping[] {
    const out: ImportColumnMapping[] = [];
    for (const [file_column, module_field] of Object.entries(mapping)) {
      if (!module_field) continue;
      out.push({ module_field, file_column });
    }
    return out;
  }

  function finishWithResult(res: ModuleImportResult, failed: boolean) {
    setProgress(res);
    setResult(res);
    setResultFailed(failed);
    setStep("result");
    setImporting(false);
    if (!failed) {
      toastSuccess(res.status || res.message || t("successToast"));
      onSuccess?.(res);
    } else {
      toastApiError(new Error(res.status || res.message || t("errors.importFailed")), t("errors.importFailed"));
    }
  }

  async function pollImportStatus(taskId: string, signal: AbortSignal) {
    while (!signal.aborted) {
      const status = await fetchModuleImportStatus(config.apiSegment, taskId);
      if (signal.aborted) return;
      setProgress(status);

      if (isImportStatusTerminal(status.state)) {
        finishWithResult({ ...status, task_id: taskId }, !isImportStatusSuccess(status.state));
        return;
      }

      await sleep(IMPORT_STATUS_POLL_MS, signal);
    }
  }

  async function handleImport() {
    if (!parsed || missingRequired.length > 0 || importing) return;
    stopPolling();
    setImporting(true);
    setProgress(null);
    setResult(null);
    setResultFailed(false);

    try {
      const payload = buildPayloadMapping();
      const queued = await postModuleImport(config.apiSegment, parsed.file, payload);

      if (!isModuleImportQueued(queued)) {
        // Legacy sync response (no task_id) — treat as finished.
        finishWithResult(queued, false);
        return;
      }

      setStep("progress");
      setProgress({
        state: queued.status || "PROCESSING",
        percent: 0,
        status: queued.message || t("processing"),
        inserted_count: 0,
        skipped_count: 0,
      });

      const controller = new AbortController();
      pollAbortRef.current = controller;
      await pollImportStatus(queued.task_id, controller.signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setImporting(false);
      toastApiError(err, t("errors.importFailed"));
      // Stay on map so the user can retry.
      setStep("map");
    } finally {
      pollAbortRef.current = null;
    }
  }

  function handleClose() {
    if (importing && step === "progress") return;
    stopPolling();
    onClose();
  }

  const title =
    step === "map"
      ? t("mapTitle")
      : step === "progress"
        ? t("progressTitle")
        : step === "result"
          ? resultFailed
            ? t("resultFailedTitle")
            : t("resultTitle")
          : t("uploadTitle", { module: config.moduleLabel });

  const description =
    step === "map"
      ? t("mapDescription")
      : step === "progress"
        ? t("progressDescription")
        : step === "result"
          ? undefined
          : t("uploadDescription");

  const footer =
    step === "upload" ? (
      <div className="flex w-full items-center justify-end gap-2">
        <AppButton type="button" variant="secondary" size="sm" onClick={handleClose} disabled={parsing}>
          {tActions("cancel")}
        </AppButton>
        <AppButton
          type="button"
          variant="primary"
          size="sm"
          disabled={!parsed || parsing}
          onClick={() => setStep("map")}
        >
          {t("next")}
        </AppButton>
      </div>
    ) : step === "map" ? (
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleResetMapping}
            disabled={importing}
          >
            <RefreshCcw className="size-3.5" aria-hidden />
            {t("resetMapping")}
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAutoMap}
            disabled={importing}
          >
            <Sparkles className="size-3.5" aria-hidden />
            {t("autoMap")}
          </AppButton>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setStep("upload");
              setParsed(null);
              setMapping({});
              setParseError(null);
            }}
            disabled={importing}
          >
            {t("back")}
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() => void handleImport()}
            disabled={importing || missingRequired.length > 0}
          >
            {importing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {t("importing")}
              </>
            ) : (
              t("import")
            )}
          </AppButton>
        </div>
      </div>
    ) : step === "progress" ? (
      <div className="flex w-full justify-end">
        <AppButton type="button" variant="secondary" size="sm" disabled>
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {t("importing")}
        </AppButton>
      </div>
    ) : (
      <div className="flex w-full justify-end">
        <AppButton type="button" variant="primary" size="sm" onClick={handleClose}>
          {t("done")}
        </AppButton>
      </div>
    );

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      size={step === "map" ? "4xl" : "lg"}
      isBusy={parsing || importing}
      closeOnBackdrop={!importing}
      footer={footer}
    >
      {step === "upload" ? (
        <div className="space-y-3">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition",
              dragActive
                ? "border-[color:var(--dash-accent,#111)] bg-slate-50 dark:bg-slate-800/60"
                : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600",
            )}
          >
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              {parsing ? (
                <Loader2 className="size-6 animate-spin text-slate-600 dark:text-slate-300" />
              ) : (
                <UploadCloud className="size-6 text-slate-600 dark:text-slate-300" />
              )}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {parsing ? t("parsing") : t("dropTitle")}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("dropHint")}</p>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {t("formats")}
              <br />
              {t("maxSize")}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={IMPORT_ACCEPT}
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </div>

          {parsed ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
              <FileSpreadsheet className="size-5 shrink-0 text-emerald-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {parsed.file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatBytes(parsed.file.size)} · {t("rowCount", { count: parsed.rowCount })}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                aria-label={t("removeFile")}
                onClick={(e) => {
                  e.stopPropagation();
                  setParsed(null);
                  setMapping({});
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}

          {parseError ? (
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{parseError}</p>
          ) : null}
        </div>
      ) : null}

      {step === "map" && parsed ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
            <span className="inline-flex items-center gap-2 truncate font-medium">
              <FileSpreadsheet className="size-3.5 shrink-0" aria-hidden />
              {parsed.file.name}
            </span>
            <span>
              {t("mappedCount", {
                mapped: mappedModuleKeys.size,
                total: config.fields.length,
              })}
              {missingRequired.length > 0 ? (
                <span className="ml-2 inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-3.5" aria-hidden />
                  {missingRequired.length}
                </span>
              ) : null}
            </span>
          </div>

          <div className="max-h-[min(52vh,420px)] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-[1] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
                    {t("columnsInFile")}
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
                    {t("fieldsInModule", { module: config.moduleLabel })}
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
                    {t("sampleData")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsed.columns.map((col, idx) => {
                  const selected = mapping[col] ?? "";
                  const options = allFieldOptions.filter(
                    (o) => !o.value || o.value === selected || !mappedModuleKeys.has(o.value),
                  );

                  return (
                    <tr
                      key={col}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <td className="px-3 py-2.5 align-middle font-medium text-slate-800 dark:text-slate-100">
                        {col}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <CheckmarkSelect
                          value={selected}
                          onChange={(v) => setColumnMapping(col, v)}
                          options={options}
                          emptyLabel={t("doNotImport")}
                          listLabel={t("fieldsListAria")}
                          searchable
                          searchPlaceholder={t("searchFields")}
                          size="sm"
                          className="min-w-[200px]"
                        />
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2.5 align-middle text-slate-500 dark:text-slate-400">
                        {parsed.sampleRow[idx] || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {missingRequired.length > 0 ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                {t("stillNeedToMap")}{" "}
                <span className="font-semibold">
                  {missingRequired.map((f) => f.label).join(", ")}
                </span>
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              {t("readyToImport")}
            </div>
          )}
        </div>
      ) : null}

      {step === "progress" ? <ImportProgressPanel progress={progress} /> : null}

      {step === "result" && result ? (
        <ImportResultSummary result={result} failed={resultFailed} />
      ) : null}
    </AppModal>
  );
}

function ImportProgressPanel({ progress }: { progress: ModuleImportStatusResult | null }) {
  const t = useTranslations("Dashboard.import");
  const percent = clampPercent(progress?.percent);
  const statusText = progress?.status || progress?.message || t("processing");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{statusText}</p>
          <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {t("percentLabel", { percent })}
          </span>
        </div>
        <div
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={t("progressTitle")}
        >
          <div
            className="h-full rounded-full bg-[color:var(--dash-accent,#0f766e)] transition-[width] duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("stats.inserted")}
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {progress?.inserted_count ?? progress?.created_count ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("stats.skipped")}
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {progress?.skipped_count ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}

function ImportResultSummary({
  result,
  failed,
}: {
  result: ModuleImportResult;
  failed: boolean;
}) {
  const t = useTranslations("Dashboard.import");

  const inserted = result.inserted_count ?? result.created_count ?? 0;
  const skipped = result.skipped_count ?? 0;
  const updated = result.updated_count ?? 0;
  const failedCount = result.failed_count ?? 0;
  const notImported = result.not_imported_count ?? 0;
  const total =
    result.total_records
    ?? inserted + skipped + updated + failedCount + notImported;

  const stats: Array<{ label: string; value: number; tone?: "ok" | "warn" | "bad" }> = [
    { label: t("stats.total"), value: total },
    { label: t("stats.inserted"), value: inserted, tone: "ok" },
    ...(updated > 0 ? [{ label: t("stats.updated"), value: updated, tone: "ok" as const }] : []),
    { label: t("stats.skipped"), value: skipped, tone: "warn" },
    ...(failedCount > 0
      ? [{ label: t("stats.failed"), value: failedCount, tone: "bad" as const }]
      : []),
    ...(notImported > 0
      ? [{ label: t("stats.notImported"), value: notImported, tone: "warn" as const }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border px-4 py-3",
          failed
            ? "border-red-200 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/30"
            : "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/30",
        )}
      >
        {failed ? (
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
        ) : (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        )}
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {result.status || result.message || (failed ? t("errors.importFailed") : t("successToast"))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {s.label}
            </p>
            <p
              className={cn(
                "mt-0.5 text-lg font-semibold tabular-nums",
                s.tone === "ok" && "text-emerald-700 dark:text-emerald-400",
                s.tone === "warn" && s.value > 0 && "text-amber-700 dark:text-amber-400",
                s.tone === "bad" && s.value > 0 && "text-red-600 dark:text-red-400",
                !s.tone && "text-slate-900 dark:text-slate-100",
              )}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
