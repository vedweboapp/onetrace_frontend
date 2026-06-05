"use client";

import * as React from "react";
import { Calendar, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchDispatchesPage } from "@/features/dispatches/api/dispatch.api";
import { DispatchStatusBadge } from "@/features/dispatches/components/dispatch-status-badge";
import { dispatchStatusLabel } from "@/features/dispatches/components/dispatch-detail-body";
import type { DispatchListItem } from "@/features/dispatches/types/dispatch.types";
import { dispatchWorkerLabel } from "@/features/dispatches/utils/dispatch-display.util";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { buildDetailHrefWithListReturn } from "@/shared/utils/detail-from-list.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";

export function DispatchesPanel() {
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

  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } = useListUrlState();
  const [items, setItems] = React.useState<DispatchListItem[]>([]);
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
  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const commitSearch = React.useCallback(
    (value: string) => setUrl({ search: value || null, page: null }),
    [setUrl],
  );

  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters: hasListActiveFilters({ search }),
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: rows, pagination: p } = await fetchDispatchesPage(page, pageSize, {
          search: search.trim() || undefined,
        });
        if (!cancelled) {
          setItems(rows);
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
  }, [page, pageSize, search, t]);

  const tableColumns = React.useMemo(() => {
    const c = entityCol<DispatchListItem>();
    return [
      c.primary("dispatch_number", t("table.dispatchId"), (r) => r.dispatch_number),
      c.truncate("job_name", t("table.jobName"), (r) => r.job_name?.trim() || "—"),
      c.date("dispatch_date", t("table.dispatchDate"), (r) => r.dispatch_date, dateFmt),
      c.custom("status", t("table.status"), (r) => (
        <DispatchStatusBadge status={r.status} label={dispatchStatusLabel(t, r.status)} />
      )),
      c.truncate("worker_name", t("table.workerName"), (r) => dispatchWorkerLabel(r.worker_name)),
      c.tabular("total_qty", t("table.qty"), (r) => r.total_qty, { cellClassName: "text-right" }),
    ];
  }, [dateFmt, t]);

  const pageRange = getListPageRange(pagination.current_page, pagination.page_size, pagination.total_records);

  return (
    <div className="space-y-4">
      {!hideListChrome ? (
        <ListPageHeader
          title={t("pageTitle")}
          subtitle={t("pageSubtitle")}
          filtersActive={filtersActive}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          controls={
            <ListPageSearchField
              value={search}
              onCommit={commitSearch}
              placeholder={t("searchPlaceholder")}
              ariaLabel={tList("searchAria")}
              className="sm:max-w-sm"
            />
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
              iconName: "jobs",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
            }}
            onClearFilters={() => setUrl({ search: null, page: null }, { replace: true })}
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  dataListRowId={row.id}
                  className={highlightClassName(row.id)}
                  title={row.dispatch_number}
                  subtitle={row.job_name?.trim() || "—"}
                  meta={<span className="block truncate">{dispatchWorkerLabel(row.worker_name)}</span>}
                  footer={
                    <div className="flex w-full flex-wrap items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Calendar className="size-3.5" aria-hidden />
                        {formatFlexibleApiDate(row.dispatch_date, dateFmt)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Package className="size-3.5" aria-hidden />
                        {row.total_qty} {t("units")}
                      </span>
                      <DispatchStatusBadge status={row.status} label={dispatchStatusLabel(t, row.status)} />
                    </div>
                  }
                  onCardClick={() => openDetail(row.id)}
                  menu={
                    <DataTableRowActionsMenu
                      menuAriaLabel={tList("openRowActions")}
                      items={[
                        {
                          id: "view",
                          label: t("actions.view"),
                          onSelect: () => openDetail(row.id),
                        },
                      ]}
                    />
                  }
                />
              ))}
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
