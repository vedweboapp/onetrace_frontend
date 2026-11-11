"use client";

import * as React from "react";
import { Download, FileWarning, Loader2, Redo2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  downloadDataAdministrationOriginal,
  downloadDataAdministrationSkipped,
  redoDataAdministrationLog,
  undoDataAdministrationLog,
} from "@/features/settings/data-administration/api/data-administration.api";
import type { DataAdministrationLog } from "@/features/settings/data-administration/types/data-administration.types";
import {
  dataAdminCanRedo,
  dataAdminCanUndo,
  dataAdminCount,
  dataAdminLogActor,
  dataAdminLogFileName,
  dataAdminLogModule,
  dataAdminLogStatus,
  dataAdminLogWhen,
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

type BusyAction = "undo" | "redo" | "original" | "skipped";

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
  const [busy, setBusy] = React.useState<{ id: number; action: BusyAction } | null>(null);
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

  async function runAction(row: DataAdministrationLog, action: BusyAction) {
    setBusy({ id: row.id, action });
    try {
      if (action === "undo") {
        await undoDataAdministrationLog(row.id);
        toastSuccess(t("undoToast"));
      } else if (action === "redo") {
        await redoDataAdministrationLog(row.id);
        toastSuccess(t("redoToast"));
      } else if (action === "original") {
        await downloadDataAdministrationOriginal(row.id);
        toastSuccess(t("downloadOriginalToast"));
      } else {
        await downloadDataAdministrationSkipped(row.id);
        toastSuccess(t("downloadSkippedToast"));
      }
      if (action === "undo" || action === "redo") await reload();
    } catch (error) {
      toastApiError(
        error,
        action === "undo"
          ? t("undoError")
          : action === "redo"
            ? t("redoError")
            : action === "original"
              ? t("downloadOriginalError")
              : t("downloadSkippedError"),
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
              const added = dataAdminCount(row.added_count ?? row.created_count);
              const updated = dataAdminCount(row.updated_count);
              const skipped = dataAdminCount(row.skipped_count);
              const rowBusy = busy?.id === row.id;
              return (
                <li
                  key={row.id}
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
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {dataAdminLogStatus(row)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {[dataAdminLogActor(row), when ? dateFmt.format(new Date(when)) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {added != null || updated != null || skipped != null ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {[
                          added != null ? t("counts.added", { count: added }) : null,
                          updated != null ? t("counts.updated", { count: updated }) : null,
                          skipped != null ? t("counts.skipped", { count: skipped }) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "flex shrink-0 items-center gap-0.5 self-end opacity-100 transition-opacity sm:self-start",
                      "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100",
                    )}
                    aria-label={t("rowActions")}
                  >
                    {kind === "import" ? (
                      <>
                        <ActionIconButton
                          label={t("undo")}
                          disabled={rowBusy || !dataAdminCanUndo(row)}
                          loading={busy?.id === row.id && busy.action === "undo"}
                          onClick={() => void runAction(row, "undo")}
                        >
                          <Undo2 className="size-3.5" aria-hidden />
                        </ActionIconButton>
                        <ActionIconButton
                          label={t("redo")}
                          disabled={rowBusy || !dataAdminCanRedo(row)}
                          loading={busy?.id === row.id && busy.action === "redo"}
                          onClick={() => void runAction(row, "redo")}
                        >
                          <Redo2 className="size-3.5" aria-hidden />
                        </ActionIconButton>
                      </>
                    ) : null}
                    <ActionIconButton
                      label={t("downloadOriginal")}
                      disabled={rowBusy}
                      loading={busy?.id === row.id && busy.action === "original"}
                      onClick={() => void runAction(row, "original")}
                    >
                      <Download className="size-3.5" aria-hidden />
                    </ActionIconButton>
                    {kind === "import" ? (
                      <ActionIconButton
                        label={t("downloadSkipped")}
                        disabled={rowBusy}
                        loading={busy?.id === row.id && busy.action === "skipped"}
                        onClick={() => void runAction(row, "skipped")}
                      >
                        <FileWarning className="size-3.5" aria-hidden />
                      </ActionIconButton>
                    ) : null}
                  </div>
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
