"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchCompositeItemsPage } from "@/features/composite-items/api/composite-item.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { deleteGroup, fetchGroupsPage } from "@/features/groups/api/group.api";
import type { Group } from "@/features/groups/types/group.types";
import {
  groupLinkedItemsNamesSummary,
  groupLinkedItemsSummaryText,
} from "@/features/groups/utils/group-linked-item-display.util";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  ActiveStatusBadge,
  AddButton, AppButton,
  ConfirmDialog,
  DashboardEmptyState,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
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

export function GroupsPanel() {
  const t = useTranslations("Dashboard.groups");
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

  const openGroupDetail = React.useCallback(
    (id: number) => {
      router.push(buildDetailHrefWithListReturn(`${pathname}/${id}`, listHref, id));
    },
    [listHref, pathname, router],
  );

  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } =
    useListUrlState();

  const [items, setItems] = React.useState<Group[]>([]);
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
  const [compositeById, setCompositeById] = React.useState<Map<number, CompositeItem>>(new Map());

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingGroup, setDeletingGroup] = React.useState<Group | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

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
        const { items: nextItems, pagination: p } = await fetchGroupsPage(page, pageSize, {
          search: search || undefined,
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
  }, [page, pageSize, search, refreshNonce, t]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: composites } = await fetchCompositeItemsPage(1, 500);
        if (cancelled) return;
        setCompositeById(new Map(composites.map((it) => [it.id, it])));
      } catch {
        if (!cancelled) setCompositeById(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  const hasActiveFilters = hasListActiveFilters({ search });
  const hideListChrome = !loadError && !loading && items.length === 0 && !hasActiveFilters;
  const pageRange = getListPageRange(pagination);

  function openCreate() {
    router.push(`${pathname}/new?back=${encodeURIComponent(listHref)}`);
  }

  function openEdit(row: Group) {
    router.push(`${pathname}/${row.id}/edit?back=${encodeURIComponent(listHref)}`);
  }

  function handleSaved() {
    setRefreshNonce((n) => n + 1);
  }

  async function confirmDelete() {
    if (!deletingGroup) return;
    setDeleting(true);
    try {
      await deleteGroup(deletingGroup.id);
      toastSuccess(t("deletedToast"));
      setDeleteOpen(false);
      setDeletingGroup(null);
      handleSaved();
    } catch {
      
    } finally {
      setDeleting(false);
    }
  }

  const tableColumns = React.useMemo(() => {
    const c = entityCol<Group>();
    return [
      c.primary("name", t("table.name"), (r) => r.name),
      c.tabular("itemCount", t("table.itemCount"), (r) => r.items?.length ?? 0, {
        cellClassName: "text-slate-600 dark:text-slate-400",
      }),
      c.truncate(
        "composite",
        t("table.compositeItems"),
        (r) => groupLinkedItemsNamesSummary(r.items ?? [], compositeById),
        {
          maxWidth: "lg",
          title: (r) =>
            r.items?.length ? groupLinkedItemsSummaryText(r.items, compositeById) : undefined,
        },
      ),
      c.date("created", t("table.created"), (r) => r.created_at, dateFmt, {
        responsive: "lg",
        cellClassName: "text-slate-600 dark:text-slate-400",
      }),
    
      c.actions(
        "actions",
        t("table.actions"),
        (row) => (
          <DataTableRowActionsMenu
            menuAriaLabel={tList("openRowActions")}
            items={[
              {
                id: "edit",
                label: t("edit"),
                icon: Pencil,
                onSelect: () => void openEdit(row),
              },
              {
                id: "delete",
                label: t("delete"),
                icon: Trash2,
                tone: "danger",
                onSelect: () => {
                  setDeletingGroup(row);
                  setDeleteOpen(true);
                },
              },
            ]}
          />
        ),
        { headerSrOnly: false },
      ),
    ];
  }, [compositeById, t, tList, dateFmt]);

  return (
    <div className="space-y-4">
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={hasActiveFilters}
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
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
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
                  size="sm"
                  onClick={() => setUrl({ search: null, page: null }, { replace: true })}
                >
                  {tList("clearFilters")}
                </AppButton>
              }
            />
          ) : (
            <DashboardEmptyState
              iconName="groups"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <AddButton type="button" onClick={openCreate} />
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
                  subtitle={
                    row.items && row.items.length > 0
                      ? t("compositeCount", { count: row.items.length })
                      : t("noCompositeLinked")
                  }
                  description={
                    row.items && row.items.length > 0
                      ? groupLinkedItemsSummaryText(row.items, compositeById, 2)
                      : undefined
                  }
                  footer={
                    <div className="flex w-full flex-wrap items-center justify-between gap-3">
                      <ActiveStatusBadge
                        active={row.is_active}
                        label={row.is_active ? t("statusActive") : t("statusInactive")}
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {tList("cardCreated", { date: dateFmt.format(new Date(row.created_at)) })}
                      </span>
                    </div>
                  }
                  onCardClick={() => openGroupDetail(row.id)}
                  menu={
                    <DataTableRowActionsMenu
                      menuAriaLabel={tList("openRowActions")}
                      items={[
                        {
                          id: "edit",
                          label: t("edit"),
                          icon: Pencil,
                          onSelect: () => void openEdit(row),
                        },
                        {
                          id: "delete",
                          label: t("delete"),
                          icon: Trash2,
                          tone: "danger",
                          onSelect: () => {
                            setDeletingGroup(row);
                            setDeleteOpen(true);
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
            onRowClick={(row) => openGroupDetail(row.id)}
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
        open={deleteOpen}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={deletingGroup?.name}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
