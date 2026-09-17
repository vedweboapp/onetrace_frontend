"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { completeDispatchReturnRequest } from "@/features/dispatches/api/dispatch.api";
import type { DispatchReturnRequest } from "@/features/dispatches/types/dispatch.types";
import { dispatchReturnWorkerLabel } from "@/features/dispatches/utils/dispatch-return.util";
import { returnRequestStatusLabel } from "@/features/dispatches/utils/return-request-list.util";
import { cn } from "@/core/utils/http.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { triggerBlobDownload } from "@/shared/mass-actions/mass-action.util";
import type { MassExportFormat } from "@/shared/mass-actions/types";
import { AppButton, CheckmarkSelect } from "@/shared/ui";

type ReturnMassActionKind = "mass-return-to-stock" | "mass-export";

type Props = {
  selectedIds: number[];
  selectedRows: DispatchReturnRequest[];
  disabled?: boolean;
  onSuccess: () => void;
};

const massBarSelectSlot = "w-[8.75rem] shrink-0 sm:w-[9.25rem]";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function exportReturnRequests(rows: DispatchReturnRequest[], format: MassExportFormat, t: (key: string) => string) {
  const headers = [
    t("return.detail.requestNumber"),
    t("table.workerName"),
    t("table.status"),
    t("return.detail.requestedAt"),
    t("return.list.items"),
    t("table.qty"),
  ];
  const lines = rows.map((row) => [
    row.request_number,
    dispatchReturnWorkerLabel(row.worker_name),
    returnRequestStatusLabel(t, row.status),
    row.requested_at.slice(0, 10),
    String(row.lines.length),
    String(row.lines.reduce((sum, line) => sum + line.quantity, 0)),
  ]);
  const csv = [headers, ...lines].map((line) => line.map((cell) => csvEscape(cell)).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  triggerBlobDownload(blob, `return-requests-export.${format === "xlsx" ? "xlsx" : "csv"}`);
}

export function ReturnRequestMassActionBar({ selectedIds, selectedRows, disabled, onSuccess }: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const tMass = useTranslations("Dashboard.massActions");

  const [action, setAction] = React.useState<ReturnMassActionKind | "">("");
  const [exportFormat, setExportFormat] = React.useState<MassExportFormat | "">("");
  const [busy, setBusy] = React.useState(false);

  const pendingSelectedIds = React.useMemo(
    () => selectedRows.filter((row) => row.status === "pending").map((row) => row.id),
    [selectedRows],
  );

  const actionOptions = React.useMemo(
    () => [
      { value: "mass-return-to-stock", label: t("return.massActionReturnToStock") },
      { value: "mass-export", label: tMass("actions.massExport") },
    ],
    [t, tMass],
  );

  const exportFormatOptions = React.useMemo(
    () => [
      { value: "xlsx", label: tMass("exportFormatXlsx") },
      { value: "csv", label: tMass("exportFormatCsv") },
    ],
    [tMass],
  );

  React.useEffect(() => {
    setExportFormat(action === "mass-export" ? "xlsx" : "");
  }, [action]);

  const canApply =
    selectedIds.length > 0 &&
    action !== "" &&
    (action === "mass-export"
      ? exportFormat !== ""
      : action === "mass-return-to-stock" && pendingSelectedIds.length > 0);

  async function handleApply() {
    if (!canApply || busy) return;
    setBusy(true);
    try {
      if (action === "mass-export" && exportFormat) {
        exportReturnRequests(selectedRows, exportFormat, t);
        setAction("");
        onSuccess();
        return;
      }
      if (action === "mass-return-to-stock") {
        for (const id of pendingSelectedIds) {
          await completeDispatchReturnRequest(id);
        }
        toastSuccess(t("return.massCompleteSuccessToast"));
        setAction("");
        onSuccess();
      }
    } finally {
      setBusy(false);
    }
  }

  if (selectedIds.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-nowrap items-center gap-2 overflow-x-auto rounded-lg border border-slate-200/90 bg-white px-3 py-2 shadow-sm",
        "dark:border-slate-700/90 dark:bg-slate-900/90",
      )}
      role="region"
      aria-label={tMass("bulkBarAria")}
    >
      <span className="shrink-0 whitespace-nowrap rounded-md bg-[color:var(--dash-accent,#111)]/10 px-2 py-1 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
        {tMass("selectedCount", { count: selectedIds.length })}
      </span>

      <div className="h-6 w-px shrink-0 bg-slate-200 dark:bg-slate-700" aria-hidden />

      <CheckmarkSelect
        listLabel={tMass("actionLabel")}
        buttonAriaLabel={tMass("actionLabel")}
        options={actionOptions}
        value={action}
        emptyLabel={tMass("pickAction")}
        disabled={disabled || busy}
        portaled
        searchable={false}
        clearable
        size="sm"
        className={massBarSelectSlot}
        onChange={(v) => setAction((v as ReturnMassActionKind) || "")}
      />

      {action === "mass-export" ? (
        <CheckmarkSelect
          listLabel={tMass("exportFormatLabel")}
          buttonAriaLabel={tMass("exportFormatLabel")}
          options={exportFormatOptions}
          value={exportFormat}
          emptyLabel={tMass("pickExportFormat")}
          disabled={disabled || busy}
          portaled
          searchable={false}
          size="sm"
          className={massBarSelectSlot}
          onChange={(v) => setExportFormat((v as MassExportFormat) || "")}
        />
      ) : null}

      <AppButton
        type="button"
        variant="primary"
        size="sm"
        loading={busy}
        disabled={!canApply || disabled || busy}
        className="shrink-0"
        onClick={() => void handleApply()}
      >
        {tMass("apply")}
      </AppButton>
    </div>
  );
}
