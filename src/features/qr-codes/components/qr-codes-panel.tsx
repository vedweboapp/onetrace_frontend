"use client";

import * as React from "react";
import { QrCode, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { deleteQrCode, fetchAllQrCodeIds, fetchQrCodesPage } from "@/features/qr-codes/api/qr-code.api";
import { fetchJobsPage } from "@/features/jobs/api/job.api";
import { QrCodeGenerateModal } from "@/features/qr-codes/components/qr-code-generate-modal";
import { QrCodeGenerateResultModal } from "@/features/qr-codes/components/qr-code-generate-result-modal";
import type {
  QrCode as QrCodeRecord,
  QrCodeGenerateResult,
  QrCodeStatus,
} from "@/features/qr-codes/types/qr-code.types";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  ActiveStatusBadge,
  AddButton,
  CheckmarkSelect,
  ConfirmDialog,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  listPageRootClassName,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { buildDetailHrefWithListReturn } from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { useDeferredListOptions } from "@/shared/hooks/use-deferred-list-options";
import { toastSuccess, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import {
  MassActionBar,
  buildQrCodeMassUpdateFields,
  massSelectionColumn,
  useEntityListMassActions,
} from "@/shared/mass-actions";

function isQrAssigned(row: QrCodeRecord): boolean {
  return row.status === "assigned" || row.is_assigned;
}

const QR_STATUS_VALUES: QrCodeStatus[] = ["assigned", "not_assigned"];

export function QrCodesPanel() {
  const t = useTranslations("Dashboard.qrCodes");
  const tList = useTranslations("Dashboard.list");
  const dateFmt = useDashboardDateFormat();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { highlightClassName } = useListRowHighlight();

  const statusParam = searchParams.get("status");
  const statusFilter =
    statusParam && QR_STATUS_VALUES.includes(statusParam as QrCodeStatus)
      ? (statusParam as QrCodeStatus)
      : undefined;

  const listHref = React.useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("highlight");
    const qs = p.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }, [pathname, searchParams]);

  const openDetail = React.useCallback(
    (id: number) => {
      router.push(buildDetailHrefWithListReturn(`${pathname}/${id}`, listHref, id));
    },
    [listHref, pathname, router],
  );

  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } = useListUrlState();

  const [items, setItems] = React.useState<QrCodeRecord[]>([]);
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
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [generateResultOpen, setGenerateResultOpen] = React.useState(false);
  const [generateResult, setGenerateResult] = React.useState<QrCodeGenerateResult | null>(null);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingRow, setDeletingRow] = React.useState<QrCodeRecord | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const [fetchJobOptions, setFetchJobOptions] = React.useState(false);

  const loadJobOptions = React.useCallback(async () => {
    const { items: jobs } = await fetchJobsPage(1, 500, undefined, { silent: true });
    return jobs.map((j) => ({
      value: String(j.id),
      label: j.title?.trim() || `#${j.id}`,
    }));
  }, []);

  const { options: jobOptions } = useDeferredListOptions(loadJobOptions, fetchJobOptions);

  const statusFilterOptions = React.useMemo(
    () => [
      { value: "assigned", label: t("status.assigned") },
      { value: "not_assigned", label: t("status.notAssigned") },
    ],
    [t],
  );

  const listFilters = React.useMemo(
    () => ({ search: search || undefined, status: statusFilter }),
    [search, statusFilter],
  );

  const massUpdateFields = React.useMemo(
    () =>
      buildQrCodeMassUpdateFields(
        { statusOptions: statusFilterOptions, jobOptions },
        {
          status: t("table.status"),
          assignedTo: t("table.assignedJob"),
        },
      ),
    [t, statusFilterOptions, jobOptions],
  );

  const fetchAllIds = React.useCallback(() => fetchAllQrCodeIds(listFilters), [listFilters]);

  const mass = useEntityListMassActions({
    resource: "qrCodes",
    totalRecords: pagination.total_records,
    pageItems: items,
    fetchAllIds,
    resetDeps: [pageSize, search, statusFilter],
    updateFields: massUpdateFields,
    onApplied: () => setRefreshNonce((n) => n + 1),
  });

  React.useEffect(() => {
    if (mass.selectedCount > 0) setFetchJobOptions(true);
  }, [mass.selectedCount]);

  const massSel = React.useMemo(() => massSelectionColumn(mass, items.length), [mass, items.length]);

  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchQrCodesPage(page, pageSize, {
          search: search || undefined,
          status: statusFilter,
        });
        if (!cancelled) {
          setItems(nextItems);
          setPagination(p);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getApiErrorDisplayMessage(error, t("loadError")));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, statusFilter, refreshNonce, t]);

  async function confirmDelete() {
    if (!deletingRow) return;
    setDeleting(true);
    try {
      await deleteQrCode(deletingRow.id);
      toastSuccess(t("deletedToast"));
      setDeleteOpen(false);
      setDeletingRow(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

  const tableColumns = React.useMemo(() => {
    const c = entityCol<QrCodeRecord>();
    return [
      massSel.tableColumn,
      c.custom(
        "qr_image",
        t("table.qrImage"),
        (row) =>
          row.qr_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.qr_image}
              alt={row.qr_code_id}
              className="size-12 shrink-0 rounded-md border border-slate-200 bg-white object-contain p-1 dark:border-slate-700 dark:bg-slate-950"
            />
          ) : (
            <span
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900"
              aria-hidden
            >
              —
            </span>
          ),
        { narrow: true, headerClassName: "w-[4.5rem]" },
      ),
      c.primary("qr_code_id", t("table.qrCodeId"), (r) => (
        <span className="font-mono text-sm">{r.qr_code_id}</span>
      )),
      c.truncate("batch", t("table.batchNumber"), (r) =>
        r.batch_detail?.batch_number?.trim() || "—",
      ),
      c.truncate("status", t("table.status"), (r) =>
        isQrAssigned(r) ? t("status.assigned") : t("status.notAssigned"),
      ),
      c.truncate("assigned", t("table.assignedJob"), (r) =>
        r.assigned_to_id != null && r.assigned_to_id > 0 ? `#${r.assigned_to_id}` : "—",
      ),
      c.truncate("scan_count", t("table.scanCount"), (r) => String(r.scan_count)),
      c.truncate("last_scanned", t("table.lastScanned"), (r) => {
        if (!r.last_scanned_at) return "—";
        const d = new Date(r.last_scanned_at);
        return Number.isNaN(d.getTime()) ? r.last_scanned_at : dateFmt.format(d);
      }),
      c.date("created", t("table.created"), (r) => r.created_at, dateFmt),
      // c.actions("actions", t("table.actions"), (row) => (
      //   <DataTableRowActionsMenu
      //     menuAriaLabel={tList("openRowActions")}
      //     items={[
      //       {
      //         id: "delete",
      //         label: t("delete"),
      //         icon: Trash2,
      //         tone: "danger",
      //         onSelect: () => {
      //           setDeletingRow(row);
      //           setDeleteOpen(true);
      //         },
      //       },
      //     ]}
      //   />
      // )),
    ];
  }, [t, tList, dateFmt, massSel.tableColumn]);

  const hasActiveFilters = hasListActiveFilters({ search, statusParam });
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });
  const pageRange = getListPageRange(pagination);

  return (
    <div className={listPageRootClassName()}>
      {!hideListChrome ? (
      <ListPageHeader
        filtersActive={filtersActive}
        viewMode={listViewMode}
        onViewModeChange={setListViewMode}
        tableViewLabel={tList("tableView")}
        listViewLabel={tList("listView")}
        action={
          <AddButton type="button" onClick={() => setGenerateOpen(true)}>
            {t("generate.button")}
          </AddButton>
        }
        controls={
          <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <ListPageSearchField
              value={search}
              onCommit={commitSearch}
              placeholder={t("searchPlaceholder")}
              ariaLabel={tList("searchAria")}
              className="sm:max-w-sm"
            />
            <CheckmarkSelect
              listLabel={t("filterStatus")}
              buttonAriaLabel={t("filterStatus")}
              options={statusFilterOptions}
              value={statusParam ?? ""}
              emptyLabel={t("filterAllStatuses")}
              portaled
              clearable
              clearAriaLabel={tList("clearFilter")}
              className="w-full min-w-0 sm:w-44"
              onChange={(v) => setUrl({ status: v || null, page: null }, { replace: true })}
            />
          </div>
        }
      />
      ) : null}

      {mass.selectedCount > 0 && !listLoading && !loadError ? (
        <MassActionBar
          selectedIds={mass.selectedIds}
          config={mass.config}
          updateFields={mass.updateFields}
          onSuccess={mass.handleMassSuccess}
        />
      ) : null}

      <SurfaceShell className={listPageSurfaceShellClassName(hideListChrome)}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : listLoading ? (
          listViewMode === "list" ? (
            <div className="p-4 sm:p-6">
              <ListPageCardGrid>
                {Array.from({ length: 6 }, (_, i) => (
                  <ListPageCardSkeleton key={i} />
                ))}
              </ListPageCardGrid>
            </div>
          ) : (
            <div className="space-y-2 p-6">
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          )
        ) : items.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              icon: QrCode,
              title: t("emptyTitle"),
              description: t("emptyDescription"),
              action: (
                <AddButton type="button" onClick={() => setGenerateOpen(true)}>
                  {t("generate.button")}
                </AddButton>
              ),
            }}
            onClearFilters={() => setUrl({ search: null, status: null, page: null }, { replace: true })}
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => {
                const assigned = isQrAssigned(row);
                return (
                  <ListPageCard
                    key={row.id}
                    dataListRowId={row.id}
                    className={highlightClassName(row.id)}
                    title={row.qr_code_id}
                    subtitle={
                      [
                        row.batch_detail?.batch_number?.trim()
                          ? t("cardBatch", { batch: row.batch_detail.batch_number.trim() })
                          : null,
                        row.assigned_to_id != null && row.assigned_to_id > 0
                          ? t("cardAssignedJob", { id: row.assigned_to_id })
                          : t("cardNotAssigned"),
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    }
                    footer={
                      <div className="flex w-full flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <ActiveStatusBadge
                            active={assigned}
                            label={assigned ? t("status.assigned") : t("status.notAssigned")}
                          />
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {t("cardScans", { count: row.scan_count })}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {tList("cardCreated", { date: dateFmt.format(new Date(row.created_at)) })}
                        </span>
                      </div>
                    }
                    onCardClick={() => openDetail(row.id)}
                    leading={
                      <div className="flex items-start gap-2">
                        {massSel.cardLeading(row)}
                        {row.qr_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.qr_image}
                            alt={row.qr_code_id}
                            className="size-16 shrink-0 rounded-md border border-slate-200 bg-white object-contain p-1 dark:border-slate-700"
                          />
                        ) : null}
                      </div>
                    }
                    menu={
                      <DataTableRowActionsMenu
                        menuAriaLabel={tList("openRowActions")}
                        items={[
                          {
                            id: "delete",
                            label: t("delete"),
                            icon: Trash2,
                            tone: "danger",
                            onSelect: () => {
                              setDeletingRow(row);
                              setDeleteOpen(true);
                            },
                          },
                        ]}
                      />
                    }
                  />
                );
              })}
            </ListPageCardGrid>
          </div>
        ) : (
          <EntityDataTable
            columns={tableColumns}
            rows={items}
            onRowClick={(row) => openDetail(row.id)}
            getRowClassName={(row) => highlightClassName(row.id)}
          />
        )}

        {!loading && !loadError && items.length > 0 ? (
          <DataTablePaginationBar
            pagination={pagination}
            summary={t("pageLabel", {
              start: pageRange.start,
              end: pageRange.end,
              total: pagination.total_records,
            })}
            prevLabel={t("prev")}
            nextLabel={t("next")}
            onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
            onNext={() => setPage(pagination.current_page + 1)}
            onPageSelect={(p) => setPage(p)}
            pageSizeControl={{
              label: tList("rowsPerPage"),
              listLabel: tList("rowsPerPage"),
              value: pageSize,
              options: pageSizeOptions,
              onChange: setPageSize,
              disabled: loading,
            }}
          />
        ) : null}
      </SurfaceShell>

      <QrCodeGenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerated={(result) => {
          setGenerateResult(result);
          setGenerateResultOpen(true);
          setRefreshNonce((n) => n + 1);
        }}
      />

      <QrCodeGenerateResultModal
        open={generateResultOpen}
        result={generateResult}
        onClose={() => setGenerateResultOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={deletingRow?.qr_code_id}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("generate.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
