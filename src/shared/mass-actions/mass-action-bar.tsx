"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/core/utils/http.util";
import {
  AppButton,
  CheckmarkSelect,
  ConfirmDialog,
  SurfaceDateInput,
  nativeDatePickerHitAreaClassName,
} from "@/shared/ui";
import { createMassActionClient } from "./mass-action.api";
import { buildMassExportPayload, buildMassIdsPayload, buildMassUpdatePayload } from "./mass-action.util";
import type { MassActionConfig, MassActionKind, MassExportFormat, MassUpdateFieldDef } from "./types";

type Props = {
  selectedIds: number[];
  config: MassActionConfig;
  updateFields: MassUpdateFieldDef[];
  disabled?: boolean;
  onSuccess: () => void;
};

const ACTION_OPTIONS: { value: MassActionKind; labelKey: MassActionKind }[] = [
  { value: "mass-update", labelKey: "mass-update" },
  { value: "mass-delete", labelKey: "mass-delete" },
  { value: "mass-export", labelKey: "mass-export" },
];

/** Matches CheckmarkSelect `size="sm"` trigger (h-8, rounded-md, text-xs). */
const massBarFieldClass = cn(
  "h-8 min-h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium shadow-sm outline-none transition",
  "text-slate-900 placeholder:font-normal placeholder:text-slate-400",
  "focus-visible:border-[color:var(--dash-accent,#111111)] focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#111111)]/25",
  "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400",
  "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
  "dark:disabled:border-slate-800 dark:disabled:bg-slate-900/80 dark:disabled:text-slate-600",
);

const massBarSelectSlot = "w-[8.75rem] shrink-0 sm:w-[9.25rem]";
const massBarValueSlot = "w-[8.75rem] shrink-0 sm:w-[9.25rem]";

export function MassActionBar({ selectedIds, config, updateFields, disabled, onSuccess }: Props) {
  const t = useTranslations("Dashboard.massActions");
  const client = React.useMemo(() => createMassActionClient(config), [config]);

  const [action, setAction] = React.useState<MassActionKind | "">("");
  const [fieldName, setFieldName] = React.useState("");
  const [fieldValue, setFieldValue] = React.useState("");
  const [exportFormat, setExportFormat] = React.useState<MassExportFormat | "">("");
  const [busy, setBusy] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const selectedField = React.useMemo(
    () => updateFields.find((f) => f.name === fieldName) ?? null,
    [fieldName, updateFields],
  );

  const fieldOptions = React.useMemo(
    () => updateFields.map((f) => ({ value: f.name, label: f.label })),
    [updateFields],
  );

  const actionOptions = React.useMemo(
    () =>
      ACTION_OPTIONS.map((opt) => ({
        value: opt.value,
        label:
          opt.value === "mass-update"
            ? t("actions.massUpdate")
            : opt.value === "mass-delete"
              ? t("actions.massDelete")
              : t("actions.massExport"),
      })),
    [t],
  );

  const exportFormatOptions = React.useMemo(
    () => [
      { value: "xlsx", label: t("exportFormatXlsx") },
      { value: "csv", label: t("exportFormatCsv") },
    ],
    [t],
  );

  React.useEffect(() => {
    setFieldName("");
    setFieldValue("");
    setExportFormat(action === "mass-export" ? "xlsx" : "");
  }, [action]);

  React.useEffect(() => {
    setFieldValue("");
  }, [fieldName]);

  const canApply =
    selectedIds.length > 0 &&
    action !== "" &&
    (action === "mass-delete" ||
      (action === "mass-export" && exportFormat !== "") ||
      (action === "mass-update" && fieldName.trim() !== "" && fieldValue.trim() !== ""));

  async function runMassDelete() {
    setBusy(true);
    try {
      await client.massDelete(buildMassIdsPayload(config, selectedIds));
      setDeleteConfirmOpen(false);
      setAction("");
      onSuccess();
    } catch {
      /* axios interceptor */
    } finally {
      setBusy(false);
    }
  }

  async function runMassExport() {
    if (!exportFormat) return;
    setBusy(true);
    try {
      await client.massExport(
        buildMassExportPayload(config, selectedIds, exportFormat),
        exportFormat,
      );
      setAction("");
      onSuccess();
    } catch {
      /* axios interceptor */
    } finally {
      setBusy(false);
    }
  }

  async function runMassUpdate() {
    if (!fieldName.trim() || !fieldValue.trim()) return;
    setBusy(true);
    try {
      const body = buildMassUpdatePayload(config, selectedIds, fieldName, fieldValue, updateFields);
      await client.massUpdate(body);
      setAction("");
      onSuccess();
    } catch {
      /* axios interceptor */
    } finally {
      setBusy(false);
    }
  }

  function handleApply() {
    if (!canApply || busy) return;
    if (action === "mass-delete") {
      setDeleteConfirmOpen(true);
      return;
    }
    if (action === "mass-export") {
      void runMassExport();
      return;
    }
    void runMassUpdate();
  }

  if (selectedIds.length === 0) return null;

  const showUpdateFields = action === "mass-update";
  const showExportFormat = action === "mass-export";

  return (
    <>
      <div
        className={cn(
          "flex flex-nowrap items-center gap-2 overflow-x-auto rounded-lg border border-slate-200/90 bg-white px-3 py-2 shadow-sm",
          "dark:border-slate-700/90 dark:bg-slate-900/90",
        )}
        role="region"
        aria-label={t("bulkBarAria")}
      >
        <span className="shrink-0 whitespace-nowrap rounded-md bg-[color:var(--dash-accent,#111)]/10 px-2 py-1 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
          {t("selectedCount", { count: selectedIds.length })}
        </span>

        <div className="h-6 w-px shrink-0 bg-slate-200 dark:bg-slate-700" aria-hidden />

        <CheckmarkSelect
          listLabel={t("actionLabel")}
          buttonAriaLabel={t("actionLabel")}
          options={actionOptions}
          value={action}
          emptyLabel={t("pickAction")}
          disabled={disabled || busy}
          portaled
          searchable={false}
          clearable
          size="sm"
          className={massBarSelectSlot}
          onChange={(v) => setAction((v as MassActionKind) || "")}
        />

        {showExportFormat ? (
          <CheckmarkSelect
            listLabel={t("exportFormatLabel")}
            buttonAriaLabel={t("exportFormatLabel")}
            options={exportFormatOptions}
            value={exportFormat}
            emptyLabel={t("pickExportFormat")}
            disabled={disabled || busy}
            portaled
            searchable={false}
            size="sm"
            className={massBarSelectSlot}
            onChange={(v) => setExportFormat((v as MassExportFormat) || "")}
          />
        ) : null}

        {showUpdateFields ? (
          <>
            <CheckmarkSelect
              listLabel={t("fieldLabel")}
              buttonAriaLabel={t("fieldLabel")}
              options={fieldOptions}
              value={fieldName}
              emptyLabel={t("pickField")}
              disabled={disabled || busy || fieldOptions.length === 0}
              portaled
              searchable
              clearable
              size="sm"
              className={massBarSelectSlot}
              onChange={setFieldName}
            />
            <div className={massBarValueSlot}>
              {selectedField?.valueType === "select" ? (
                <CheckmarkSelect
                  listLabel={t("valueLabel")}
                  buttonAriaLabel={t("valueLabel")}
                  options={selectedField.options ?? []}
                  value={fieldValue}
                  emptyLabel={t("pickValue")}
                  disabled={disabled || busy || !fieldName}
                  portaled
                  searchable
                  clearable
                  size="sm"
                  className="w-full"
                  onChange={setFieldValue}
                />
              ) : selectedField?.valueType === "date" ? (
                <SurfaceDateInput
                  type="date"
                  value={fieldValue}
                  disabled={disabled || busy || !fieldName}
                  className={cn(massBarFieldClass, nativeDatePickerHitAreaClassName)}
                  onChange={(e) => setFieldValue(e.target.value)}
                />
              ) : selectedField?.valueType === "datetime" ? (
                <SurfaceDateInput
                  type="datetime-local"
                  value={fieldValue}
                  disabled={disabled || busy || !fieldName}
                  className={cn(massBarFieldClass, nativeDatePickerHitAreaClassName)}
                  onChange={(e) => setFieldValue(e.target.value)}
                />
              ) : selectedField?.valueType === "textarea" ? (
                <textarea
                  value={fieldValue}
                  rows={1}
                  onChange={(e) => setFieldValue(e.target.value)}
                  disabled={disabled || busy || !fieldName}
                  className={cn(massBarFieldClass, "resize-none py-1.5 leading-tight")}
                  placeholder={t("valuePlaceholder")}
                />
              ) : (
                <input
                  type={selectedField?.valueType === "number" ? "number" : "text"}
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  disabled={disabled || busy || !fieldName}
                  className={massBarFieldClass}
                  placeholder={t("valuePlaceholder")}
                />
              )}
            </div>
          </>
        ) : null}

        <AppButton
          type="button"
          variant="primary"
          size="sm"
          loading={busy}
          disabled={!canApply || disabled || busy}
          className="shrink-0"
          onClick={handleApply}
        >
          {t("apply")}
        </AppButton>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => (!busy ? setDeleteConfirmOpen(false) : undefined)}
        onConfirm={() => void runMassDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody", { count: selectedIds.length })}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("cancel")}
        isBusy={busy}
      />
    </>
  );
}
