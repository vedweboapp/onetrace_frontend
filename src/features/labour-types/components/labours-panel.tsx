"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  deleteLabourType,
  fetchLabourTypesPage,
} from "@/features/labour-types/api/labour-type.api";
import type { LabourType } from "@/features/labour-types/types/labour-type.types";
import { parseLabourNumber } from "@/features/labour-types/utils/labour-type-numbers.util";
import { toastApiError, toastSuccess, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  AddButton,
  ConfirmDialog,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  listPageRootClassName,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { buildDetailHrefWithListReturn, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { useOrgCurrency } from "@/shared/money/use-org-currency";
import { routes } from "@/shared/config/routes";

export function LaboursPanel() {
  const t = useTranslations("Dashboard.labours");
  const tList = useTranslations("Dashboard.list");
  const { formatMoneyValue: moneyDisplay } = useOrgCurrency();
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

  const openCreate = React.useCallback(() => {
    router.push(buildPathWithStoredBack(`${routes.dashboard.labours}/new`, listHref));
  }, [listHref, router]);

  const openEdit = React.useCallback(
    (row: LabourType) => {
      router.push(buildPathWithStoredBack(`${routes.dashboard.labours}/${row.id}/edit`, listHref));
    },
    [listHref, router],
  );

  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } =
    useListUrlState();
  const [items, setItems] = React.useState<LabourType[]>([]);
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
  const [deleteTarget, setDeleteTarget] = React.useState<LabourType | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const pageRange = getListPageRange(pagination);
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
        const { items: next, pagination: p } = await fetchLabourTypesPage(page, pageSize, {
          search: search || undefined,
        });
        if (!cancelled) {
          setItems(next);
          setPagination(p);
        }
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          setLoadError(getApiErrorDisplayMessage(error, t("loadError")));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, refreshNonce, search, t]);

  const hasActiveFilters = hasListActiveFilters({ search });
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });

  const tableColumns = React.useMemo(() => {
    const c = entityCol<LabourType>();
    return [
      c.primary("name", t("table.name"), (row) => row.name),
      c.tabular("cost", t("table.costRate"), (row) => moneyDisplay(parseLabourNumber(row.default_cost_rate))),
      c.tabular("markup", t("table.markup"), (row) => `${parseLabourNumber(row.default_markup)}%`),
      c.tabular("sell", t("table.sellPrice"), (row) => moneyDisplay(parseLabourNumber(row.default_sell_price))),
      c.date("created", t("table.created"), (row) => row.created_at, dateFmt, { responsive: "lg" }),
    ];
  }, [t, dateFmt, moneyDisplay]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLabourType(deleteTarget.id);
      toastSuccess(t("deletedToast"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      toastApiError(error, t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={listPageRootClassName()}>
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={filtersActive}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          action={<AddButton type="button" onClick={openCreate} />}
          controls={
            <ListPageSearchField value={search} onCommit={commitSearch} className="sm:max-w-sm" />
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
              iconName: "labours",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
              action: <AddButton type="button" onClick={openCreate} />,
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
                  title={row.name}
                  description={`${t("table.costRate")}: ${moneyDisplay(parseLabourNumber(row.default_cost_rate))} · ${t("table.sellPrice")}: ${moneyDisplay(parseLabourNumber(row.default_sell_price))}`}
                  footer={
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {tList("cardCreated", { date: dateFmt.format(new Date(row.created_at)) })}
                    </span>
                  }
                  onCardClick={() => openDetail(row.id)}
                  menu={
                    <DataTableRowActionsMenu
                      menuAriaLabel={tList("openRowActions")}
                      items={[
                        { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row) },
                        {
                          id: "delete",
                          label: t("delete"),
                          icon: Trash2,
                          tone: "danger",
                          onSelect: () => setDeleteTarget(row),
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
            rowHighlightId={(row) => row.id}
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
              disabled: listLoading,
            }}
          />
        ) : null}
      </SurfaceShell>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => (!deleting ? setDeleteTarget(null) : undefined)}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={deleteTarget?.name}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("cancel")}
        confirmVariant="danger"
        isBusy={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
