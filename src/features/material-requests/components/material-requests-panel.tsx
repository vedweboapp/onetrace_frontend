"use client";

import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";

import * as React from "react";
import { Calendar, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  fetchAllMaterialRequestIds,
  fetchMaterialRequestsPage,
} from "@/features/material-requests/api/material-request.api";
import { useMaterialStatusCatalog } from "@/features/material-status/hooks/use-material-status-catalog";
import { MaterialRequestStatusBadge } from "@/features/material-requests/components/material-request-status-badge";
import type { MaterialRequestListItem } from "@/features/material-requests/types/material-request.types";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import {
  materialRequestItemsCount,
  materialRequestJobSerial,
  materialRequestWorkerLabel,
  nestedId,
} from "@/features/material-requests/utils/material-request-nested-fields.util";
import { DetailEntityLink, EntityDataTable, entityCol } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  CheckmarkSelect,
  DataTablePaginationBar,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  listPageRootClassName,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceDateInput,
  SurfaceShell,
} from "@/shared/ui";
import { buildDetailHrefWithListReturn } from "@/shared/utils/detail-from-list.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { useDeferredListOptions } from "@/shared/hooks/use-deferred-list-options";
import {
  MassActionBar,
  buildMaterialRequestMassUpdateFields,
  massSelectionColumn,
  useEntityListMassActions,
} from "@/shared/mass-actions";

export function MaterialRequestsPanel() {
  const t = useTranslations("Dashboard.materialRequests");
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

  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } = useListUrlState();

  const statusParam = searchParams.get("status");
  const workerParam = searchParams.get("worker_name");
  const requestedDateParam = searchParams.get("requested_date");
  const statusFilter = statusParam?.trim() || undefined;
  const workerFilter = workerParam?.trim() || undefined;
  const requestedDateFilter = requestedDateParam?.trim() || undefined;

  const [items, setItems] = React.useState<MaterialRequestListItem[]>([]);
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
  const [fetchWorkerOptions, setFetchWorkerOptions] = React.useState(() => Boolean(workerParam));
  const [fetchStatusCatalog, setFetchStatusCatalog] = React.useState(
    () => Boolean(statusParam),
  );

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const { options: statusFilterOptions, labelFor: statusLabel, rowFor: statusRowFor } =
    useMaterialStatusCatalog(fetchStatusCatalog);

  const loadWorkerOptions = React.useCallback(async () => {
    return loadTechnicianOptions();
  }, []);

  const { options: workerOptions } = useDeferredListOptions(loadWorkerOptions, fetchWorkerOptions);

  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  React.useEffect(() => {
    if (statusParam) setFetchStatusCatalog(true);
  }, [statusParam]);

  React.useEffect(() => {
    if (workerParam) setFetchWorkerOptions(true);
  }, [workerParam]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchMaterialRequestsPage(page, pageSize, {
          search: search || undefined,
          status: statusFilter,
          worker_name: workerFilter,
          requested_date: requestedDateFilter,
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
  }, [page, pageSize, search, statusFilter, workerFilter, requestedDateFilter, refreshNonce, t]);

  const workerLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of workerOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [workerOptions]);

  const hasActiveFilters = hasListActiveFilters({
    search,
    statusParam,
    workerNameParam: workerParam,
    requestedDateParam,
  });
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });
  const pageRange = getListPageRange(pagination);

  const listFilters = React.useMemo(
    () => ({
      search: search || undefined,
      status: statusFilter,
      worker_name: workerFilter,
      requested_date: requestedDateFilter,
    }),
    [search, statusFilter, workerFilter, requestedDateFilter],
  );

  const massUpdateFields = React.useMemo(
    () =>
      buildMaterialRequestMassUpdateFields(
        { workerOptions, statusOptions: statusFilterOptions },
        {
          worker: t("filterWorker"),
          requestedDate: t("table.requestDate"),
          status: t("table.status"),
          notes: t("fields.notes"),
        },
      ),
    [t, workerOptions, statusFilterOptions],
  );

  const fetchAllIds = React.useCallback(() => fetchAllMaterialRequestIds(listFilters), [listFilters]);

  const mass = useEntityListMassActions({
    resource: "materialRequests",
    totalRecords: pagination.total_records,
    pageItems: items,
    fetchAllIds,
    resetDeps: [pageSize, search, statusFilter, workerFilter, requestedDateFilter],
    updateFields: massUpdateFields,
    onApplied: () => setRefreshNonce((n) => n + 1),
  });

  React.useEffect(() => {
    if (mass.selectedCount > 0) {
      setFetchWorkerOptions(true);
      setFetchStatusCatalog(true);
    }
  }, [mass.selectedCount]);

  const massSel = React.useMemo(() => massSelectionColumn(mass, items.length), [mass, items.length]);

  const tableColumns = React.useMemo(() => {
    const c = entityCol<MaterialRequestListItem>();
    const workerDisplay = (row: MaterialRequestListItem) => {
      const workerId = nestedId(row.worker_name);
      return materialRequestWorkerLabel(
        row.worker_name,
        workerId != null ? workerLabelById[workerId] : undefined,
      );
    };

    return [
      massSel.tableColumn,
      c.primary("request", t("table.requestNumber"), (r) => r.request_number),
      c.custom("job", t("table.jobName"), (r) => {
        const jobs = r.jobs ?? [];
        if (jobs.length === 0) return "—";
        return (
          <span className="flex min-w-0 flex-wrap items-center gap-x-1">
            {jobs.map((job, index) => (
              <React.Fragment key={job.id}>
                {index > 0 ? <span className="text-slate-400">,</span> : null}
                <DetailEntityLink
                  href={`${routes.dashboard.jobs}/${job.id}`}
                  className="font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  {materialRequestJobSerial(job)}
                </DetailEntityLink>
              </React.Fragment>
            ))}
          </span>
        );
      }),
      c.link(
        "worker",
        t("table.workerName"),
        (r) => workerDisplay(r),
        (r) => {
          const workerId = nestedId(r.worker_name);
          return workerId != null ? `${routes.dashboard.settingsUsers}/${workerId}` : null;
        },
        { title: (r) => workerDisplay(r) },
      ),
      c.tabular("requested", t("table.requestDate"), (r) =>
        formatFlexibleApiDate(r.requested_date, dateFmt),
      ),
      c.tabular("items", t("table.items"), (r) => String(materialRequestItemsCount(r))),
      c.custom("status", t("table.status"), (r) => (
        <MaterialRequestStatusBadge
          status={r.status}
          label={statusLabel(r.status)}
          statusRow={statusRowFor(r.status)}
        />
      )),
      // c.actions("actions", tList("openRowActions"), (row) => (
      //   <DataTableRowActionsMenu
      //     menuAriaLabel={tList("openRowActions")}
      //     items={[{ id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row.id) }]}
      //   />
      // )),
    ];
  }, [t, tList, dateFmt, workerLabelById, statusLabel, statusRowFor, massSel.tableColumn]);

  return (
    <div className={listPageRootClassName()}>
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={filtersActive}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          controls={
            <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ListPageSearchField
                value={search}
                onCommit={commitSearch}
                placeholder={t("searchPlaceholder")}
                ariaLabel={t("searchAria")}
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
                onOpenChange={(open) => {
                  if (open) setFetchStatusCatalog(true);
                }}
                onChange={(v) => setUrl({ status: v || null, page: null }, { replace: true })}
              />
              <CheckmarkSelect
                listLabel={t("filterWorker")}
                buttonAriaLabel={t("filterWorker")}
                options={workerOptions}
                value={workerParam ?? ""}
                emptyLabel={t("filterAllWorkers")}
                portaled
                searchable
                clearable
                clearAriaLabel={tList("clearFilter")}
                className="w-full min-w-0 sm:w-56"
                onOpenChange={(open) => {
                  if (open) setFetchWorkerOptions(true);
                }}
                onChange={(v) => setUrl({ worker_name: v || null, page: null }, { replace: true })}
              />
              <SurfaceDateInput
                type="date"
                value={requestedDateParam ?? ""}
                aria-label={t("filterRequestedDate")}
                className="w-full min-w-0 sm:w-44"
                onChange={(e) =>
                  setUrl({ requested_date: e.target.value || null, page: null }, { replace: true })
                }
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
            </div>
          )
        ) : items.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "clients",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
            }}
            onClearFilters={() =>
              setUrl(
                { search: null, status: null, worker_name: null, requested_date: null, page: null },
                { replace: true },
              )
            }
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => {
                const workerId = nestedId(row.worker_name);
                const workerDisplay = materialRequestWorkerLabel(
                  row.worker_name,
                  workerId != null ? workerLabelById[workerId] : undefined,
                );
                const requestedLabel = formatFlexibleApiDate(row.requested_date, dateFmt);
                const itemsCount = materialRequestItemsCount(row);
                return (
                  <ListPageCard
                    key={row.id}
                    dataListRowId={row.id}
                    className={highlightClassName(row.id)}
                    leading={massSel.cardLeading(row)}
                    title={row.request_number}
                    subtitle={
                      (row.jobs ?? []).length > 0 ? (
                        <span className="flex min-w-0 flex-wrap items-center gap-x-1" onClick={(e) => e.stopPropagation()}>
                          {(row.jobs ?? []).map((job, index) => (
                            <React.Fragment key={job.id}>
                              {index > 0 ? <span className="text-slate-400">,</span> : null}
                              <DetailEntityLink
                                href={`${routes.dashboard.jobs}/${job.id}`}
                                className="font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {materialRequestJobSerial(job)}
                              </DetailEntityLink>
                            </React.Fragment>
                          ))}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                    meta={
                      workerId != null ? (
                        <DetailEntityLink
                          href={`${routes.dashboard.settingsUsers}/${workerId}`}
                          className="block min-w-0 truncate font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {workerDisplay}
                        </DetailEntityLink>
                      ) : (
                        <span className="block min-w-0 truncate">{workerDisplay}</span>
                      )
                    }
                    footer={
                      <div className="flex w-full flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                            <Calendar className="size-3.5 shrink-0" aria-hidden />
                            <span className="uppercase tracking-wide text-[10px] text-slate-500">
                              {t("card.requestDate")}
                            </span>
                            <span className="tabular-nums">{requestedLabel}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                            <Package className="size-3.5 shrink-0" aria-hidden />
                            <span>{t("card.items", { count: itemsCount })}</span>
                          </span>
                          <MaterialRequestStatusBadge
                            status={row.status}
                            label={statusLabel(row.status)}
                            statusRow={statusRowFor(row.status)}
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
    </div>
  );
}
