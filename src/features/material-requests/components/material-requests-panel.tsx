"use client";

import * as React from "react";
import { Calendar, Package, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchMaterialRequestsPage } from "@/features/material-requests/api/material-request.api";
import { MaterialRequestStatusBadge } from "@/features/material-requests/components/material-request-status-badge";
import type { MaterialRequestListItem } from "@/features/material-requests/types/material-request.types";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import {
  materialRequestItemsCount,
  materialRequestJobLabel,
  materialRequestWorkerLabel,
  nestedId,
  normalizeMaterialRequestStatus,
} from "@/features/material-requests/utils/material-request-nested-fields.util";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  AddButton,
  AppButton,
  CheckmarkSelect,
  DataTablePaginationBar,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  DataTableRowActionsMenu,
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

export function MaterialRequestsPanel() {
  const t = useTranslations("Dashboard.materialRequests");
  const tList = useTranslations("Dashboard.list");
  const dateFmt = useDashboardDateFormat();
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
  const [workerOptions, setWorkerOptions] = React.useState<{ value: string; label: string }[]>([]);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const statusFilterOptions = React.useMemo(
    () => [
      { value: "draft", label: t("status.draft") },
      { value: "pending", label: t("status.pending") },
      { value: "partially_dispatched", label: t("status.partiallyDispatched") },
      { value: "dispatched", label: t("status.dispatched") },
    ],
    [t],
  );

  const statusLabel = React.useCallback(
    (code: string | null | undefined) => {
      const norm = normalizeMaterialRequestStatus(code);
      if (norm === "draft") return t("status.draft");
      if (norm === "pending") return t("status.pending");
      if (norm === "partially_dispatched" || norm === "partial") return t("status.partiallyDispatched");
      if (norm === "dispatched") return t("status.dispatched");
      return code?.trim() || "—";
    },
    [t],
  );

  const openCreate = React.useCallback(() => {
    router.push(`${pathname}/new?back=${encodeURIComponent(listHref)}`);
  }, [listHref, pathname, router]);

  const openEdit = React.useCallback(
    (id: number) => {
      router.push(`${pathname}/${id}/edit?back=${encodeURIComponent(listHref)}`);
    },
    [listHref, pathname, router],
  );

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
      } catch {
        if (!cancelled) {
          setLoadError(t("loadError"));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, statusFilter, workerFilter, requestedDateFilter, t]);

  const workerLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of workerOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [workerOptions]);

  const hasActiveFilters =
    hasListActiveFilters({ search, statusParam }) ||
    Boolean(workerParam?.trim()) ||
    Boolean(requestedDateParam?.trim());
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });
  const pageRange = getListPageRange(pagination);

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
      c.primary("request", t("table.requestNumber"), (r) => r.request_number),
      c.truncate("job", t("table.jobName"), (r) => materialRequestJobLabel(r), {
        title: (r) => materialRequestJobLabel(r),
      }),
      c.truncate("worker", t("table.workerName"), (r) => workerDisplay(r), {
        title: (r) => workerDisplay(r),
      }),
      c.tabular("requested", t("table.requestDate"), (r) =>
        formatFlexibleApiDate(r.requested_date, dateFmt),
      ),
      c.tabular("items", t("table.items"), (r) => String(materialRequestItemsCount(r))),
      c.custom("status", t("table.status"), (r) => (
        <MaterialRequestStatusBadge status={r.status} label={statusLabel(r.status)} />
      )),
      c.actions("actions", tList("openRowActions"), (row) => (
        <DataTableRowActionsMenu
          menuAriaLabel={tList("openRowActions")}
          items={[{ id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row.id) }]}
        />
      )),
    ];
  }, [t, tList, dateFmt, workerLabelById, statusLabel, openEdit]);

  return (
    <div className="space-y-4">
      {!hideListChrome ? (
        <ListPageHeader
          title={t("title")}
          description={t("subtitle")}
          variant="page"
          filtersActive={filtersActive}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          action={<AddButton type="button" onClick={openCreate}>{t("createRequest")}</AddButton>}
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
              action: (
                <AppButton type="button" variant="primary" size="sm" onClick={openCreate}>
                  <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                  {t("createRequest")}
                </AppButton>
              ),
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
                    title={row.request_number}
                    subtitle={materialRequestJobLabel(row)}
                    meta={<span className="block min-w-0 truncate">{workerDisplay}</span>}
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
                          <MaterialRequestStatusBadge status={row.status} label={statusLabel(row.status)} />
                        </div>
                      </div>
                    }
                    onCardClick={() => openDetail(row.id)}
                    menu={
                      <DataTableRowActionsMenu
                        menuAriaLabel={tList("openRowActions")}
                        items={[{ id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row.id) }]}
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
    </div>
  );
}
