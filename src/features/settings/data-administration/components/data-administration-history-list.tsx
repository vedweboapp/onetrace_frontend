"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Download, FileSpreadsheet, Loader2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  downloadDataAdministrationOriginal,
  downloadDataAdministrationSkipped,
  undoDataAdministrationLog,
} from "@/features/settings/data-administration/api/data-administration.api";
import type {
  DataAdministrationExportFormat,
  DataAdministrationLog,
  DataAdministrationLogId,
} from "@/features/settings/data-administration/types/data-administration.types";
import {
  dataAdminCanUndo,
  dataAdminCount,
  dataAdminLogActor,
  dataAdminLogFileName,
  dataAdminLogFormat,
  dataAdminLogModule,
  dataAdminLogStatus,
  dataAdminLogWhen,
  dataAdminRecordsCount,
} from "@/features/settings/data-administration/utils/data-administration-display.util";
import { getApiErrorDisplayMessage, toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import {
  DashboardEmptyState,
  DataTablePaginationBar,
  SurfaceShell,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Kind = "import" | "export";

type Props = {
  kind: Kind;
  loadPage: (
    page: number,
    pageSize: number,
  ) => Promise<{
    items: DataAdministrationLog[];
    pagination: {
      total_records: number;
      total_pages: number;
      current_page: number;
      page_size: number;
      next: string | null;
      previous: string | null;
    };
  }>;
};

type BusyAction = "undo" | "skipped" | "original";

const EXPORT_FORMATS: DataAdministrationExportFormat[] = ["xlsx", "csv"];

export function DataAdministrationHistoryList({ kind, loadPage }: Props) {
  const t = useTranslations("Dashboard.dataAdministration");
  const dateFmt = useDashboardDateFormat();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [items, setItems] = React.useState<DataAdministrationLog[]>([]);
  const [pagination, setPagination] = React.useState({
    total_records: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
    next: null as string | null,
    previous: null as string | null,
  });
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<{
    id: DataAdministrationLogId;
    action: BusyAction;
  } | null>(null);
  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await loadPage(page, pageSize);
      setItems(result.items);
      setPagination(result.pagination);
    } catch (error) {
      setItems([]);
      setLoadError(getApiErrorDisplayMessage(error, t("loadError")));
    } finally {
      setLoading(false);
    }
  }, [loadPage, page, pageSize, t]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const range = getListPageRange(pagination);

  async function runUndo(row: DataAdministrationLog) {
    setBusy({ id: row.id, action: "undo" });
    try {
      await undoDataAdministrationLog(row.id);
      toastSuccess(t("undoToast"));
      await reload();
    } catch (error) {
      toastApiError(error, t("undoError"));
    } finally {
      setBusy(null);
    }
  }

  async function runDownload(
    row: DataAdministrationLog,
    action: "skipped" | "original",
    exportFormat: DataAdministrationExportFormat,
  ) {
    setBusy({ id: row.id, action });
    try {
      if (action === "skipped") {
        await downloadDataAdministrationSkipped(row.id, exportFormat);
        toastSuccess(t("downloadSkippedToast"));
      } else {
        await downloadDataAdministrationOriginal(row.id, exportFormat);
        toastSuccess(t("downloadOriginalToast"));
      }
    } catch (error) {
      toastApiError(
        error,
        action === "skipped" ? t("downloadSkippedError") : t("downloadOriginalError"),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <SurfaceShell className="rounded-xl">
      <div className="space-y-4 p-4 sm:p-6">
        {loading && items.length === 0 ? (
          <div className="space-y-2 py-2">
            <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : loadError ? (
          <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : items.length === 0 ? (
          <DashboardEmptyState
            iconName="default"
            title={kind === "import" ? t("importEmptyTitle") : t("exportEmptyTitle")}
            description={kind === "import" ? t("importEmptyDescription") : t("exportEmptyDescription")}
            compact
          />
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {items.map((row) => {
              const when = dataAdminLogWhen(row);
              const status = dataAdminLogStatus(row);
              const format = dataAdminLogFormat(row);
              const records = dataAdminRecordsCount(row);
              const added = dataAdminCount(row.added_count ?? row.created_count);
              const updated = dataAdminCount(row.updated_count);
              const skipped = dataAdminCount(row.skipped_count);
              const rowBusy = busy?.id === row.id;
              const countParts = [
                kind === "export" && records != null
                  ? t("counts.exported", { count: records })
                  : null,
                kind === "import" && row.imported_records_count != null
                  ? t("counts.imported", { count: row.imported_records_count })
                  : null,
                kind === "import" && added != null ? t("counts.added", { count: added }) : null,
                kind === "import" && updated != null
                  ? t("counts.updated", { count: updated })
                  : null,
                kind === "import" && skipped != null
                  ? t("counts.skipped", { count: skipped })
                  : null,
                kind === "import" &&
                records != null &&
                row.imported_records_count == null &&
                added == null &&
                updated == null &&
                skipped == null
                  ? t("counts.records", { count: records })
                  : null,
              ].filter(Boolean);

              return (
                <li
                  key={String(row.id)}
                  className="group flex flex-col gap-3 px-3 py-3 transition hover:bg-slate-50/90 sm:flex-row sm:items-start sm:justify-between sm:px-4 dark:hover:bg-slate-900/50"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {dataAdminLogFileName(row)}
                      </p>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {dataAdminLogModule(row)}
                      </span>
                      {format ? (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {format}
                        </span>
                      ) : null}
                      {status ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {status}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {[dataAdminLogActor(row), when ? dateFmt.format(new Date(when)) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {countParts.length > 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {countParts.join(" · ")}
                      </p>
                    ) : null}
                  </div>

                  {kind === "import" ? (
                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-0.5 self-end opacity-100 transition-opacity sm:self-start",
                        "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100",
                      )}
                      aria-label={t("rowActions")}
                    >
                      <ActionIconButton
                        label={t("undo")}
                        disabled={rowBusy || !dataAdminCanUndo(row)}
                        loading={busy?.id === row.id && busy.action === "undo"}
                        onClick={() => void runUndo(row)}
                      >
                        <Undo2 className="size-3.5" aria-hidden />
                      </ActionIconButton>
                      <FormatDownloadButton
                        label={t("downloadSkipped")}
                        formatLabel={t("exportFormatLabel")}
                        formatXlsx={t("exportFormatXlsx")}
                        formatCsv={t("exportFormatCsv")}
                        disabled={rowBusy}
                        loading={busy?.id === row.id && busy.action === "skipped"}
                        onDownload={(exportFormat) => void runDownload(row, "skipped", exportFormat)}
                      >
                        <Download className="size-3.5" aria-hidden />
                      </FormatDownloadButton>
                      <FormatDownloadButton
                        label={t("downloadOriginal")}
                        formatLabel={t("exportFormatLabel")}
                        formatXlsx={t("exportFormatXlsx")}
                        formatCsv={t("exportFormatCsv")}
                        disabled={rowBusy}
                        loading={busy?.id === row.id && busy.action === "original"}
                        onDownload={(exportFormat) => void runDownload(row, "original", exportFormat)}
                      >
                        <FileSpreadsheet className="size-3.5" aria-hidden />
                      </FormatDownloadButton>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {pagination.total_records > 0 ? (
          <DataTablePaginationBar
            pagination={pagination}
            summary={t("pageLabel", {
              start: range.start,
              end: range.end,
              total: pagination.total_records,
            })}
            prevLabel={t("prev")}
            nextLabel={t("next")}
            onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
            onNext={() => setPage(pagination.current_page + 1)}
            onPageSelect={(next) => setPage(next)}
            pageSizeControl={{
              label: t("rowsPerPage"),
              listLabel: t("rowsPerPage"),
              value: pageSize,
              options: pageSizeOptions,
              onChange: (size) => {
                setPageSize(size);
                setPage(1);
              },
              disabled: loading,
            }}
          />
        ) : null}
      </div>
    </SurfaceShell>
  );
}

function ActionIconButton({
  label,
  disabled,
  loading,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : children}
    </button>
  );
}

function FormatDownloadButton({
  label,
  formatLabel,
  formatXlsx,
  formatCsv,
  disabled,
  loading,
  onDownload,
  children,
}: {
  label: string;
  formatLabel: string;
  formatXlsx: string;
  formatCsv: string;
  disabled?: boolean;
  loading?: boolean;
  onDownload: (format: DataAdministrationExportFormat) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{
    top: number;
    left: number;
    placement: "up" | "down";
  } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = React.useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 140);
  }, [clearCloseTimer]);

  const updateMenuPosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 152;
    const gap = 6;
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - menuWidth / 2),
      window.innerWidth - menuWidth - 8,
    );
    const estimatedHeight = 8 + EXPORT_FORMATS.length * 30;
    const spaceAbove = rect.top - 8;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const placement: "up" | "down" =
      spaceAbove >= estimatedHeight || spaceAbove >= spaceBelow ? "up" : "down";
    setMenuPos({
      top: placement === "up" ? rect.top - gap : rect.bottom + gap,
      left,
      placement,
    });
  }, []);

  React.useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  React.useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onReposition() {
      updateMenuPosition();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateMenuPosition]);

  const formatLabels: Record<DataAdministrationExportFormat, string> = {
    xlsx: formatXlsx,
    csv: formatCsv,
  };

  const menu =
    open && !loading && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={formatLabel}
            className={cn(
              "fixed z-[300] min-w-[9.5rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg",
              "dark:border-slate-700 dark:bg-slate-900",
            )}
            style={{
              top: menuPos.top,
              left: menuPos.left,
              transform: menuPos.placement === "up" ? "translateY(-100%)" : undefined,
            }}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
          >
            {EXPORT_FORMATS.map((format) => (
              <button
                key={format}
                type="button"
                role="menuitem"
                className={cn(
                  "flex w-full items-center px-3 py-1.5 text-left text-xs font-medium text-slate-700",
                  "hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none",
                  "dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800",
                )}
                onClick={() => {
                  setOpen(false);
                  onDownload(format);
                }}
              >
                {formatLabels[format]}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => {
        if (disabled || loading) return;
        clearCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (disabled || loading) return;
          setOpen((v) => !v);
        }}
        onFocus={() => {
          if (disabled || loading) return;
          clearCloseTimer();
          setOpen(true);
        }}
        className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : children}
      </button>
      {menu}
    </div>
  );
}
