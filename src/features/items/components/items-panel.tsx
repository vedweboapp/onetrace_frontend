"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchAllItemIds, fetchItemsPage } from "@/features/items/api/item.api";
import type { Item } from "@/features/items/types/item.types";
import { toastError, toastSuccess, toastApiError, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
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
import { cn } from "@/core/utils/http.util";
import { buildDetailHrefWithListReturn, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { deleteItem } from "@/features/items/api/item.api";
import {
  MassActionBar,
  buildItemMassUpdateFields,
  massSelectionColumn,
  useEntityListMassActions,
} from "@/shared/mass-actions";
import { useOrgCurrency } from "@/shared/money/use-org-currency";

export function ItemsPanel() {
  const t = useTranslations("Dashboard.items");
  const tComposite = useTranslations("Dashboard.compositeItems");
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

  const openItemDetail = React.useCallback(
    (id: number) => {
      router.push(buildDetailHrefWithListReturn(`${pathname}/${id}`, listHref, id));
    },
    [listHref, pathname, router],
  );

  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } = useListUrlState();
  const [items, setItems] = React.useState<Item[]>([]);
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

  const [deleteTarget, setDeleteTarget] = React.useState<Item | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const pageRange = getListPageRange(pagination);

  const listFilters = React.useMemo(
    () => ({ search: search || undefined, isComposite: false as const }),
    [search],
  );

  const massUpdateFields = React.useMemo(
    () =>
      buildItemMassUpdateFields({
        name: t("modal.name"),
        sku: t("modal.sku"),
        quantity: t("modal.quantity"),
        costPrice: t("modal.costPrice"),
        sellingPrice: t("modal.sellingPrice"),
        isActive: tComposite("table.status"),
        activeLabel: tComposite("statusActive"),
        inactiveLabel: tComposite("statusInactive"),
      }),
    [t, tComposite],
  );

  const fetchAllIds = React.useCallback(() => fetchAllItemIds(listFilters), [listFilters]);

  const mass = useEntityListMassActions({
    resource: "items",
    totalRecords: pagination.total_records,
    pageItems: items,
    fetchAllIds,
    resetDeps: [pageSize, search],
    updateFields: massUpdateFields,
    onApplied: () => setRefreshNonce((n) => n + 1),
  });

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
        const { items: next, pagination: p } = await fetchItemsPage(page, pageSize, {
          search: search || undefined,
          isComposite: false,
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

  function openCreate() {
    router.push(buildPathWithStoredBack(`${pathname}/new`, listHref));
  }

  function openEdit(row: Item) {
    router.push(buildPathWithStoredBack(`${pathname}/${row.id}/edit`, listHref));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteItem(deleteTarget.id);
      toastSuccess(t("deletedToast"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      toastApiError(error, t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  const tableColumns = React.useMemo(() => {
    const c = entityCol<Item>();
    return [
      massSel.tableColumn,
      c.primary("name", t("table.name"), (r) => r.name),
      c.mono("sku", t("table.sku"), (r) => r.sku || "—", { cellClassName: "text-slate-600 dark:text-slate-400" }),
      c.tabular("qty", t("table.quantity"), (r) => r.quantity ?? "—", {
        cellClassName: "text-slate-600 dark:text-slate-400",
      }),
      c.tabular("cost", t("modal.costPrice"), (r) => moneyDisplay(r.cost_price), {
        cellClassName: "text-slate-600 dark:text-slate-400",
      }),
      c.tabular("sell", t("modal.sellingPrice"), (r) => moneyDisplay(r.selling_price), {
        cellClassName: "text-slate-600 dark:text-slate-400",
      }),
      c.date("created", t("table.created"), (r) => r.created_at, dateFmt, {
        responsive: "lg",
        cellClassName: "text-slate-600 dark:text-slate-400",
      }),
      // c.actions("actions", t("table.actions"), (row) => (
      //   <DataTableRowActionsMenu
      //     menuAriaLabel={tList("openRowActions")}
      //     items={[
      //       { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row) },
      //       {
      //         id: "delete",
      //         label: t("delete"),
      //         icon: Trash2,
      //         tone: "danger",
      //         onSelect: () => {
      //           setDeleteTarget(row);
      //         },
      //       },
      //     ]}
      //   />
      // )),
    ];
  }, [t, tList, dateFmt, massSel.tableColumn]);

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
            <AddButton type="button" onClick={openCreate} />
          }
          controls={
            <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ListPageSearchField
                value={search}
                onCommit={commitSearch}
                placeholder={tList("searchPlaceholder")}
                ariaLabel={tList("searchAria")}
                className="sm:max-w-sm"
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
              iconName: "items",
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
                  leading={massSel.cardLeading(row)}
                  title={row.name}
                  subtitle={row.sku ? <span className="font-mono text-xs">{row.sku}</span> : undefined}
                  description={`Qty: ${row.quantity ?? "—"} · Cost: ${moneyDisplay(row.cost_price)} · Sell: ${moneyDisplay(row.selling_price)}`}
                  footer={
                    <div className="flex w-full justify-end">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {tList("cardCreated", { date: dateFmt.format(new Date(row.created_at)) })}
                      </span>
                    </div>
                  }
                  onCardClick={() => openItemDetail(row.id)}
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
                          onSelect: () => {
                            setDeleteTarget(row);
                          },
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
            onRowClick={(row) => openItemDetail(row.id)}
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => (!deleting ? setDeleteTarget(null) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={deleteTarget?.name}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("cancel")}
        isBusy={deleting}
      />
    </div>
  );
}

