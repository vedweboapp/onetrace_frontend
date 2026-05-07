"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchItemsPage } from "@/features/items/api/item.api";
import type { Item } from "@/features/items/types/item.types";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import { ItemFormModal } from "@/features/items/components/item-form-modal";
import {
  AppButton,
  ConfirmDialog,
  DataTable,
  DataTableBody,
  DataTableEmptyRow,
  DataTableHead,
  DataTablePaginationBar,
  DataTableRow,
  DataTableRowActionsMenu,
  DataTableScroll,
  DataTableTd,
  DataTableTh,
  DashboardEmptyState,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { buildDetailHrefWithListReturn } from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { deleteItem } from "@/features/items/api/item.api";

function asNumberMaybe(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function moneyDisplay(v: unknown): string {
  const n = asNumberMaybe(v);
  if (n == null) return "—";
  return n.toFixed(2);
}

export function ItemsPanel() {
  const t = useTranslations("Dashboard.items");
  const tList = useTranslations("Dashboard.list");
  const locale = useLocale();
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

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = React.useState<Item | null>(null);
  const [formKey, setFormKey] = React.useState(0);

  const [deleteTarget, setDeleteTarget] = React.useState<Item | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const pageRange = getListPageRange(pagination);

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
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
      } catch {
        if (!cancelled) {
          setItems([]);
          setLoadError(t("loadError"));
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
  const hideListChrome = !loadError && !loading && items.length === 0 && !hasActiveFilters;

  function openCreate() {
    setFormMode("create");
    setEditingItem(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function openEdit(row: Item) {
    setFormMode("edit");
    setEditingItem(row);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteItem(deleteTarget.id);
      toastSuccess(t("deletedToast"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } catch {
      toastError(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  const tableColSpan = 7;

  return (
    <div className="space-y-6">
      {!hideListChrome ? (
        <ListPageHeader
          title={t("title")}
          description={t("subtitle")}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          action={
            <AppButton type="button" variant="primary" size="md" className="gap-2" onClick={openCreate}>
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              {t("add")}
            </AppButton>
          }
          controls={
            <ListPageSearchField
              value={search}
              onCommit={commitSearch}
              placeholder={tList("searchPlaceholder")}
              ariaLabel={tList("searchAria")}
              className="sm:max-w-sm"
            />
          }
        />
      ) : null}

      <SurfaceShell className={hideListChrome ? "rounded-none border-dashed" : "rounded-none"}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : loading ? (
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
              <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          )
        ) : items.length === 0 ? (
          hasActiveFilters ? (
            <DashboardEmptyState
              iconName="noResults"
              title={tList("noResultsTitle")}
              description={tList("noResultsDescription")}
              action={
                <AppButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setUrl({ search: null, page: null }, { replace: true })}
                >
                  {tList("clearFilters")}
                </AppButton>
              }
            />
          ) : (
            <DashboardEmptyState
              iconName="items"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <AppButton type="button" variant="primary" size="md" className="gap-2" onClick={openCreate}>
                  <Plus className="size-4" strokeWidth={2} aria-hidden />
                  {t("add")}
                </AppButton>
              }
            />
          )
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  dataListRowId={row.id}
                  className={highlightClassName(row.id)}
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
          <DataTableScroll>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableTh>{t("table.name")}</DataTableTh>
                  <DataTableTh className="hidden sm:table-cell">{t("table.sku")}</DataTableTh>
                  <DataTableTh className="hidden md:table-cell">{t("table.quantity")}</DataTableTh>
                  <DataTableTh className="hidden lg:table-cell">{t("modal.costPrice")}</DataTableTh>
                  <DataTableTh className="hidden lg:table-cell">{t("modal.sellingPrice")}</DataTableTh>
                  <DataTableTh className="hidden xl:table-cell">{t("table.created")}</DataTableTh>
                  <DataTableTh narrow>
                    <span className="sr-only">{t("table.actions")}</span>
                  </DataTableTh>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {items.length === 0 ? (
                  <DataTableEmptyRow message={t("empty")} colSpan={tableColSpan} />
                ) : (
                  items.map((row) => (
                    <DataTableRow
                      key={row.id}
                      data-list-row-id={row.id}
                      className={cn(highlightClassName(row.id))}
                      clickable
                      onClick={() => openItemDetail(row.id)}
                    >
                      <DataTableTd className="font-semibold text-slate-900 dark:text-slate-100">{row.name}</DataTableTd>
                      <DataTableTd className="hidden font-mono text-xs sm:table-cell">{row.sku || "—"}</DataTableTd>
                      <DataTableTd className="hidden tabular-nums md:table-cell">{row.quantity ?? "—"}</DataTableTd>
                      <DataTableTd className="hidden tabular-nums lg:table-cell">{moneyDisplay(row.cost_price)}</DataTableTd>
                      <DataTableTd className="hidden tabular-nums lg:table-cell">{moneyDisplay(row.selling_price)}</DataTableTd>
                      <DataTableTd className="hidden text-slate-500 dark:text-slate-400 xl:table-cell">
                        {dateFmt.format(new Date(row.created_at))}
                      </DataTableTd>
                      <DataTableTd
                        narrow
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
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
                      </DataTableTd>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
          </DataTableScroll>
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

      <ItemFormModal
        key={formKey}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        item={editingItem}
        onSaved={() => setRefreshNonce((n) => n + 1)}
      />

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

