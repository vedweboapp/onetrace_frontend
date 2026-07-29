"use client";

import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";

import * as React from "react";
import { Calendar, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchDispatchesPage } from "@/features/dispatches/api/dispatch.api";
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
  AppButton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { routes } from "@/shared/config/routes";
import { buildDetailHrefWithListReturn } from "@/shared/utils/detail-from-list.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { quantityTableCellClass, quantityTableHeaderClass } from "@/shared/components/quantity/quantity-table-columns";
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
  const [items, setItems] = React.useState<any[]>([]);
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
          // Normalize server rows so UI can rely on `worker`/`worker_name`, `lines`, and `total_qty` shape
          const { normalizeDispatchList } = await import("@/features/dispatches/utils/dispatch-normalize.util");
          setItems(normalizeDispatchList(rows as any));
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
  }, [page, pageSize, search, t]);

  const tableColumns = React.useMemo(() => {
    const c = entityCol<DispatchListItem>();
    return [
      c.primary("dispatch_order_number", t("table.dispatchId"), (r) => r.dispatch_order_number),
      c.date("dispatch_date", t("table.dispatchDate"), (r) => r.dispatch_date, dateFmt),
      c.truncate(
        "worker_name",
        t("table.workerName"),
        // support responses that include either `worker_name` or `worker` object
        (r) => dispatchWorkerLabel((r as any).worker_name ?? (r as any).worker),
      ),
      c.tabular(
        "total_qty",
        t("table.qty"),
        (r) => {
          // prefer server-provided total_qty, but fall back to lines.length when present
          const lines = (r as any).lines;
          const qty = Number.isFinite(Number(r.total_qty)) ? Number(r.total_qty) : lines ? (Array.isArray(lines) ? lines.length : 0) : 0;
          return `${qty} ${t("units")}`;
        },
        { headerClassName: quantityTableHeaderClass, cellClassName: quantityTableCellClass },
      ),
    ];
  }, [dateFmt, t]);

  const pageRange = getListPageRange(pagination);

  return (
    <div className="space-y-4">
      {!hideListChrome ? (
        <ListPageHeader
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
              iconName: "items",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
              action: (
                <AppButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(routes.dashboard.materialRequests)}
                >
                  {t("emptyAction")}
                </AppButton>
              ),
            }}
            onClearFilters={() => setUrl({ search: null, page: null }, { replace: true })}
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <div key={row.id}>
                  <ListPageCard
                    dataListRowId={row.id}
                    className={highlightClassName(row.id)}
                    title={row.dispatch_order_number}
                    subtitle={dispatchWorkerLabel((row as any).worker_name ?? (row as any).worker)}
                    meta={
                      <span className="block truncate">
                        {row.material_request_number?.trim() || (row.material_request_id > 0 ? `#${row.material_request_id}` : "—")}
                      </span>
                    }
                    footer={
                      <div className="flex w-full flex-wrap items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <Calendar className="size-3.5" aria-hidden />
                          {formatFlexibleApiDate(row.dispatch_date, dateFmt)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <Package className="size-3.5" aria-hidden />
                          {((row as any).lines && Array.isArray((row as any).lines) ? (row as any).lines.length : row.total_qty) ?? 0} {t("units")}
                        </span>
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
                  {Array.isArray((row as any).lines) ? (
                    <div className="px-3 pb-3 text-sm text-slate-600">
                      {(row as any).lines.map((l: any) => (
                        <div key={l.id} className="py-0.5">
                          {l.item_name ?? `#${l.item}`}{l.is_extra ? " (extra)" : ""}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
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
