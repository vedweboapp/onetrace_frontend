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
import { postModuleImport } from "./import.api";
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
  ParsedImportFile,
} from "./types";

type Step = "upload" | "map" | "result";

type Props = {
  open: boolean;
  onClose: () => void;
  config: ModuleImportConfig;
  onSuccess?: (result: ModuleImportResult) => void;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [result, setResult] = React.useState<ModuleImportResult | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const resetState = React.useCallback(() => {
    setStep("upload");
    setDragActive(false);
    setParseError(null);
    setParsing(false);
    setParsed(null);
    setMapping({});
    setImporting(false);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  React.useEffect(() => {
    if (!open) return;
    resetState();
  }, [open, resetState]);

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

  async function handleImport() {
    if (!parsed || missingRequired.length > 0 || importing) return;
    setImporting(true);
    try {
      const payload = buildPayloadMapping();
      const res = await postModuleImport(config.apiSegment, parsed.file, payload);
      setResult(res);
      setStep("result");
      toastSuccess(res.message || t("successToast"));
      onSuccess?.(res);
    } catch (err) {
      toastApiError(err, t("errors.importFailed"));
    } finally {
      setImporting(false);
    }
  }

  const title =
    step === "map"
      ? t("mapTitle")
      : step === "result"
        ? t("resultTitle")
        : t("uploadTitle", { module: config.moduleLabel });

  const description =
    step === "map"
      ? t("mapDescription")
      : step === "result"
        ? undefined
        : t("uploadDescription");

  const footer =
    step === "upload" ? (
      <div className="flex w-full items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("oneFileHint")}</p>
        <div className="flex items-center gap-2">
          <AppButton type="button" variant="secondary" size="sm" onClick={onClose} disabled={parsing}>
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
    ) : (
      <div className="flex w-full justify-end">
        <AppButton type="button" variant="primary" size="sm" onClick={onClose}>
          {t("done")}
        </AppButton>
      </div>
    );

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size={step === "map" ? "4xl" : "lg"}
      isBusy={parsing || importing}
      footer={footer}
      className="overflow-hidden"
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

      {step === "result" && result ? (
        <ImportResultSummary result={result} />
      ) : null}
    </AppModal>
  );
}

function ImportResultSummary({ result }: { result: ModuleImportResult }) {
  const t = useTranslations("Dashboard.import");

  const stats: Array<{ label: string; value: number; tone?: "ok" | "warn" | "bad" }> = [
    { label: t("stats.total"), value: result.total_records ?? 0 },
    { label: t("stats.created"), value: result.created_count ?? 0, tone: "ok" },
    { label: t("stats.updated"), value: result.updated_count ?? 0, tone: "ok" },
    { label: t("stats.skipped"), value: result.skipped_count ?? 0, tone: "warn" },
    { label: t("stats.failed"), value: result.failed_count ?? 0, tone: "bad" },
    { label: t("stats.notImported"), value: result.not_imported_count ?? 0, tone: "warn" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {result.message || t("successToast")}
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
