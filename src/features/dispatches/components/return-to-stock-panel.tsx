"use client";

import * as React from "react";
import { Calendar, Package, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchDispatchReturnRequests, fetchDispatchesPage } from "@/features/dispatches/api/dispatch.api";
import { ReturnRequestMassActionBar } from "@/features/dispatches/components/return-request-mass-action-bar";
import { ReturnRequestStatusBadge } from "@/features/dispatches/components/return-request-status-badge";
import type {
  DispatchReturnRequest,
  DispatchReturnRequestStatus,
  WorkerReturnDatePreset,
} from "@/features/dispatches/types/dispatch.types";
import { dispatchReturnWorkerLabel } from "@/features/dispatches/utils/dispatch-return.util";
import {
  paginateReturnRequests,
  returnRequestItemSummary,
  returnRequestStatusLabel,
  returnRequestTotalQty,
} from "@/features/dispatches/utils/return-request-list.util";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import { useListMassSelection } from "@/shared/mass-actions/use-list-mass-selection";
import { massSelectionColumn } from "@/shared/mass-actions/mass-selection-column";
import {
  AddButton,
  AppButton,
  CheckmarkSelect,
  DataTablePaginationBar,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceDateInput,
  SurfaceShell,
} from "@/shared/ui";
import { buildDetailHrefWithListReturn, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";

export function ReturnToStockPanel() {
  const t = useTranslations("Dashboard.dispatches");
  const tList = useTranslations("Dashboard.list");
  const dateFmt = useDashboardDateFormat({ dateOnly: true });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { highlightClassName } = useListRowHighlight();

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

  const openCreate = React.useCallback(() => {
    router.push(buildPathWithStoredBack(`${pathname}/new`, listHref));
  }, [listHref, pathname, router]);

  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } =
    useListUrlState();

  const statusParam = searchParams.get("status");
  const workerParam = searchParams.get("worker_name");
  const datePresetParam = searchParams.get("date_preset");
  const dateFromParam = searchParams.get("date_from");
  const dateToParam = searchParams.get("date_to");
  const materialRequestParam = searchParams.get("material_request_id");

  const statusFilter = (statusParam?.trim() as DispatchReturnRequestStatus | undefined) || undefined;
  const workerFilter = workerParam?.trim() || undefined;
  const datePreset = (datePresetParam?.trim() as WorkerReturnDatePreset | undefined) || undefined;
  const dateFromFilter = dateFromParam?.trim() || undefined;
  const dateToFilter = dateToParam?.trim() || undefined;
  const materialRequestFilter = materialRequestParam?.trim() || undefined;

  const [allItems, setAllItems] = React.useState<DispatchReturnRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [workerOptions, setWorkerOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [mrOptions, setMrOptions] = React.useState<{ value: string; label: string }[]>([]);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const statusFilterOptions = React.useMemo(
    () => [
      { value: "pending", label: t("return.statusReturnRequest") },
      { value: "completed", label: t("return.statusReturnedToStock") },
      { value: "rejected", label: t("return.statusRejected") },
    ],
    [t],
  );

  const datePresetOptions = React.useMemo(
    () => [
      { value: "till_today", label: t("return.dateTillToday") },
      { value: "till_yesterday", label: t("return.dateTillYesterday") },
      { value: "this_week", label: t("return.dateTillThisWeek") },
      { value: "custom", label: t("return.dateCustom") },
      { value: "material_request", label: t("return.dateByMaterialRequest") },
    ],
    [t],
  );

  const listFilters = React.useMemo(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter,
      worker_name: workerFilter ? Number.parseInt(workerFilter, 10) : undefined,
      date_preset: datePreset,
      date_from: datePreset === "custom" ? dateFromFilter : undefined,
      date_to: datePreset === "custom" ? dateToFilter : undefined,
      material_request_id:
        datePreset === "material_request" && materialRequestFilter
          ? Number.parseInt(materialRequestFilter, 10)
          : undefined,
    }),
    [
      search,
      statusFilter,
      workerFilter,
      datePreset,
      dateFromFilter,
      dateToFilter,
      materialRequestFilter,
    ],
  );

  const pagination = React.useMemo(() => {
    const paged = paginateReturnRequests(allItems, page, pageSize);
    return {
      ...paged,
      next: paged.current_page < paged.total_pages ? "next" : null,
      previous: paged.current_page > 1 ? "prev" : null,
    };
  }, [allItems, page, pageSize]);

  const items = pagination.items;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const options = await loadTechnicianOptions();
        if (!cancelled) setWorkerOptions(options);
      } catch {
        if (!cancelled) setWorkerOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: dispatches } = await fetchDispatchesPage(1, 500);
        if (cancelled) return;
        const seen = new Set<number>();
        const options: { value: string; label: string }[] = [];
        for (const row of dispatches) {
          if (row.material_request_id <= 0 || seen.has(row.material_request_id)) continue;
          seen.add(row.material_request_id);
          options.push({
            value: String(row.material_request_id),
            label: row.material_request_number?.trim() || `MR #${row.material_request_id}`,
          });
        }
        setMrOptions(options);
      } catch {
        if (!cancelled) setMrOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await fetchDispatchReturnRequests(listFilters);
        if (!cancelled) setAllItems(rows);
      } catch {
        if (!cancelled) {
          setLoadError(t("return.loadListError"));
          setAllItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listFilters, refreshNonce, t]);

  const workerLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of workerOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [workerOptions]);

  const hasActiveFilters =
    search.trim() !== "" ||
    (statusParam != null && statusParam.trim() !== "") ||
    (workerParam != null && workerParam.trim() !== "") ||
    (datePresetParam != null && datePresetParam.trim() !== "") ||
    (dateFromParam != null && dateFromParam.trim() !== "") ||
    (dateToParam != null && dateToParam.trim() !== "") ||
    (materialRequestParam != null && materialRequestParam.trim() !== "");

  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });

  const pageRange = getListPageRange(pagination);

  const massSelection = useListMassSelection({
    pageItems: items,
    isRowSelectable: (row) => row.status === "pending",
    resetDeps: [
      pageSize,
      search,
      statusFilter,
      workerFilter,
      datePreset,
      dateFromFilter,
      dateToFilter,
      materialRequestFilter,
    ],
  });

  const massSel = React.useMemo(
    () =>
      massSelectionColumn<DispatchReturnRequest>(
        {
          selection: massSelection,
          selectAllAriaLabel: t("return.massSelectAll"),
          selectRowAriaLabel: t("return.massSelectRow"),
        },
        items.length,
        {
          isRowSelectable: (row) => row.status === "pending",
          selectableCount: items.filter((row) => row.status === "pending").length,
        },
      ),
    [massSelection, items, t],
  );

  const selectedRows = React.useMemo(
    () => allItems.filter((row) => massSelection.selectedIds.has(row.id)),
    [allItems, massSelection.selectedIds],
  );

  const handleMassSuccess = React.useCallback(() => {
    massSelection.clearSelection();
    setRefreshNonce((n) => n + 1);
  }, [massSelection]);

  const workerDisplay = React.useCallback(
    (row: DispatchReturnRequest) => {
      const workerId =
        typeof row.worker_name === "number" ? row.worker_name : row.worker_name?.id;
      return dispatchReturnWorkerLabel(
        row.worker_name,
        workerId != null ? workerLabelById[workerId] : undefined,
      );
    },
    [workerLabelById],
  );

  const tableColumns = React.useMemo(() => {
    const c = entityCol<DispatchReturnRequest>();
    return [
      massSel.tableColumn,
      c.primary("worker", t("table.workerName"), (r) => workerDisplay(r)),
      c.truncate("request", t("return.detail.requestNumber"), (r) => r.request_number),
      c.truncate("items", t("return.list.items"), (r) => returnRequestItemSummary(r), {
        title: (r) => returnRequestItemSummary(r),
      }),
      c.tabular("qty", t("table.qty"), (r) => `${returnRequestTotalQty(r)} ${t("units")}`),
      c.date("requested", t("return.detail.requestedAt"), (r) => r.requested_at, dateFmt),
      c.custom("status", t("table.status"), (r) => (
        <ReturnRequestStatusBadge
          status={r.status}
          label={returnRequestStatusLabel(t, r.status)}
        />
      )),
    ];
  }, [t, dateFmt, workerDisplay, massSel.tableColumn]);

  const commitSearch = React.useCallback(
    (value: string) => setUrl({ search: value || null, page: null }),
    [setUrl],
  );

  return (
    <div className="space-y-4">
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={filtersActive}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          action={<AddButton type="button" onClick={openCreate} />}
          controls={
            <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ListPageSearchField
                value={search}
                onCommit={commitSearch}
                placeholder={t("return.searchPlaceholder")}
                ariaLabel={tList("searchAria")}
                className="sm:max-w-sm"
              />
              <CheckmarkSelect
                listLabel={t("return.filterStatus")}
                buttonAriaLabel={t("return.filterStatus")}
                options={statusFilterOptions}
                value={statusParam ?? ""}
                emptyLabel={t("return.filterAllStatuses")}
                portaled
                clearable
                clearAriaLabel={tList("clearFilter")}
                className="w-full min-w-0 sm:w-48"
                onChange={(v) => setUrl({ status: v || null, page: null }, { replace: true })}
              />
              <CheckmarkSelect
                listLabel={t("return.filterWorker")}
                buttonAriaLabel={t("return.filterWorker")}
                options={workerOptions}
                value={workerParam ?? ""}
                emptyLabel={t("return.filterAllWorkers")}
                portaled
                searchable
                clearable
                clearAriaLabel={tList("clearFilter")}
                className="w-full min-w-0 sm:w-52"
                onChange={(v) => setUrl({ worker_name: v || null, page: null }, { replace: true })}
              />
              <CheckmarkSelect
                listLabel={t("return.dateFilter")}
                buttonAriaLabel={t("return.dateFilter")}
                options={datePresetOptions}
                value={datePresetParam ?? ""}
                emptyLabel={t("return.filterAllDates")}
                portaled
                clearable
                clearAriaLabel={tList("clearFilter")}
                className="w-full min-w-0 sm:w-44"
                onChange={(v) =>
                  setUrl(
                    {
                      date_preset: v || null,
                      date_from: null,
                      date_to: null,
                      material_request_id: v === "material_request" ? materialRequestParam : null,
                      page: null,
                    },
                    { replace: true },
                  )
                }
              />
              {datePreset === "custom" ? (
                <>
                  <SurfaceDateInput
                    type="date"
                    value={dateFromParam ?? ""}
                    aria-label={t("return.dateFrom")}
                    className="w-full min-w-0 sm:w-40"
                    onChange={(e) =>
                      setUrl({ date_from: e.target.value || null, page: null }, { replace: true })
                    }
                  />
                  <SurfaceDateInput
                    type="date"
                    value={dateToParam ?? ""}
                    aria-label={t("return.dateTo")}
                    className="w-full min-w-0 sm:w-40"
                    onChange={(e) =>
                      setUrl({ date_to: e.target.value || null, page: null }, { replace: true })
                    }
                  />
                </>
              ) : null}
              {datePreset === "material_request" ? (
                <CheckmarkSelect
                  listLabel={t("fields.materialRequest")}
                  buttonAriaLabel={t("fields.materialRequest")}
                  options={mrOptions}
                  value={materialRequestParam ?? ""}
                  emptyLabel={t("return.selectMaterialRequest")}
                  portaled
                  searchable
                  clearable
                  clearAriaLabel={tList("clearFilter")}
                  className="w-full min-w-0 sm:w-52"
                  onChange={(v) =>
                    setUrl({ material_request_id: v || null, page: null }, { replace: true })
                  }
                />
              ) : null}
            </div>
          }
        />
      ) : null}

      {massSelection.selectedCount > 0 && !listLoading && !loadError ? (
        <ReturnRequestMassActionBar
          selectedIds={[...massSelection.selectedIds]}
          selectedRows={selectedRows}
          onSuccess={handleMassSuccess}
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
            </div>
          )
        ) : items.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "items",
              title: t("return.emptyListTitle"),
              description: t("return.emptyListDescription"),
              action: (
                <AppButton type="button" variant="primary" size="sm" onClick={openCreate}>
                  <Plus className="size-4" aria-hidden />
                  {t("return.newRequest")}
                </AppButton>
              ),
            }}
            onClearFilters={() =>
              setUrl(
                {
                  search: null,
                  status: null,
                  worker_name: null,
                  date_preset: null,
                  date_from: null,
                  date_to: null,
                  material_request_id: null,
                  page: null,
                },
                { replace: true },
              )
            }
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => {
                const requestedLabel = formatFlexibleApiDate(row.requested_at, dateFmt);
                const qty = returnRequestTotalQty(row);
                const lineCount = row.lines.length;
                return (
                <ListPageCard
                  key={row.id}
                  dataListRowId={row.id}
                  className={highlightClassName(row.id)}
                  leading={massSel.cardLeading(row)}
                  title={workerDisplay(row)}
                  subtitle={row.request_number}
                  meta={<span className="block min-w-0 truncate">{returnRequestItemSummary(row)}</span>}
                  footer={
                    <div className="flex w-full flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                          <Calendar className="size-3.5 shrink-0" aria-hidden />
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("return.card.requestedAt")}
                          </span>
                          <span className="tabular-nums">{requestedLabel}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                          <Package className="size-3.5 shrink-0" aria-hidden />
                          <span>{t("return.card.items", { count: lineCount, qty })}</span>
                        </span>
                        <ReturnRequestStatusBadge
                          status={row.status}
                          label={returnRequestStatusLabel(t, row.status)}
                        />
                      </div>
                    </div>
                  }
                  onCardClick={() => openDetail(row.id)}
                  menu={null}
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

        {!listLoading && !loadError && items.length > 0 ? (
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
    </div>
  );
}
