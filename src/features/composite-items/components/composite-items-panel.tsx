"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/core/utils/http.util";
import {
  deleteCompositeItem,
  fetchCompositeItemsPage,
  updateCompositeItem,
} from "@/features/composite-items/api/composite-item.api";
import { CompositeItemFormModal } from "@/features/composite-items/components/composite-item-form-modal";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { fetchGroupsPage } from "@/features/groups/api/group.api";
import type { Group } from "@/features/groups/types/group.types";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { Link } from "@/i18n/navigation";
import { ListPageCallout } from "@/shared/components/layout/list-page-callout";
import { routes } from "@/shared/config/routes";
import { hasListActiveFilters, parseGroupIdParam, useListUrlState } from "@/shared/hooks/use-list-url-state";
import {
  AppButton,
  CheckmarkSelect,
  ConfirmDialog,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTablePaginationBar,
  DataTableRow,
  DataTableScroll,
  DataTableTd,
  DataTableTh,
  DashboardEmptyState,
  DataTableRowActionsMenu,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";

export function CompositeItemsPanel() {
  const t = useTranslations("Dashboard.compositeItems");
  const tList = useTranslations("Dashboard.list");
  const locale = useLocale();

  const {
    page,
    pageSize,
    listViewMode,
    search,
    groupParam,
    setUrl,
    setPage,
    setPageSize,
    setListViewMode,
  } = useListUrlState();
  const filterGroupId = parseGroupIdParam(groupParam) ?? null;

  const [items, setItems] = React.useState<CompositeItem[]>([]);
  const [pagination, setPagination] = React.useState({
    total_records: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
    next: null as string | null,
    previous: null as string | null,
  });

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [groupsError, setGroupsError] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(() => new Set());
  const [bulkGroupId, setBulkGroupId] = React.useState("");
  const [bulkAssigning, setBulkAssigning] = React.useState(false);
  const selectAllRef = React.useRef<HTMLInputElement>(null);

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = React.useState<CompositeItem | null>(null);
  const [formKey, setFormKey] = React.useState(0);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingItem, setDeletingItem] = React.useState<CompositeItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const groupOptions = React.useMemo(
    () => groups.map((g) => ({ value: String(g.id), label: g.name })),
    [groups],
  );

  const groupFilterSelectOptions = React.useMemo(
    () => [{ value: "", label: t("filterAllGroups") }, ...groupOptions],
    [groupOptions, t],
  );

  const bulkGroupSelectOptions = React.useMemo(
    () => [{ value: "", label: t("bulkGroupPlaceholder") }, ...groupOptions],
    [groupOptions, t],
  );

  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  const groupLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const g of groups) {
      m[g.id] = g.name;
    }
    return m;
  }, [groups]);

  const pageIds = React.useMemo(() => items.map((r) => r.id), [items]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  React.useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate = somePageSelected && !allPageSelected;
  }, [somePageSelected, allPageSelected]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bulk selection applies only to the current list scope
    setSelectedIds(new Set());
  }, [page, pageSize, filterGroupId, search]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: groupRows } = await fetchGroupsPage(1, 500);
        if (!cancelled) {
          setGroups(groupRows);
          setGroupsError(null);
        }
      } catch {
        if (!cancelled) {
          setGroups([]);
          setGroupsError(t("groupsLoadError"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: rows, pagination: p } = await fetchCompositeItemsPage(page, pageSize, {
          groupId: filterGroupId ?? undefined,
          search: search || undefined,
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
  }, [page, pageSize, filterGroupId, search, refreshNonce, t]);

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  function openCreate() {
    setFormMode("create");
    setEditingItem(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function openEdit(row: CompositeItem) {
    setFormMode("edit");
    setEditingItem(row);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function handleSaved() {
    setRefreshNonce((n) => n + 1);
  }

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      await deleteCompositeItem(deletingItem.id);
      toastSuccess(t("deletedToast"));
      setDeleteOpen(false);
      setDeletingItem(null);
      handleSaved();
    } catch {
      
    } finally {
      setDeleting(false);
    }
  }

  async function applyBulkMove() {
    if (selectedIds.size === 0) {
      toastError(t("bulkNoneSelected"));
      return;
    }
    const gid = Number.parseInt(bulkGroupId, 10);
    if (!Number.isFinite(gid) || gid <= 0) {
      toastError(t("modal.groupError"));
      return;
    }
    const ids = [...selectedIds];
    setBulkAssigning(true);
    try {
      await Promise.all(ids.map((id) => updateCompositeItem(id, { group: gid })));
      toastSuccess(t("bulkAssignedToast", { count: ids.length }));
      setSelectedIds(new Set());
      setBulkGroupId("");
      handleSaved();
    } catch {
      
    } finally {
      setBulkAssigning(false);
    }
  }

  const hasActiveFilters = hasListActiveFilters({ search, groupParam });
  const hideListChrome = !loadError && !loading && items.length === 0 && !hasActiveFilters;
  const pageRange = getListPageRange(pagination);

  return (
    <div className="space-y-4">
      <ListPageCallout>
        <span className="text-slate-600 dark:text-slate-400">
          {t("groupsHint.prefix")}{" "}
          <Link
            href={routes.dashboard.groups}
            className="font-medium text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
          >
            {t("groupsHint.link")}
          </Link>
          {t("groupsHint.suffix")}
        </span>
      </ListPageCallout>

      {!hideListChrome ? (
        <ListPageHeader
          title={t("title")}
          description={t("subtitle")}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          action={
            <AppButton type="button" variant="primary" size="md" onClick={openCreate} className="gap-2">
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              {t("add")}
            </AppButton>
          }
          controls={
            <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              <ListPageSearchField
                value={search}
                onCommit={commitSearch}
                placeholder={tList("searchPlaceholder")}
                ariaLabel={tList("searchAria")}
                className="sm:max-w-sm"
              />
              <div className="min-w-0 sm:w-56">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("filterGroup")}
                </span>
                <CheckmarkSelect
                  listLabel={t("filterGroup")}
                  options={groupFilterSelectOptions}
                  value={groupParam ?? ""}
                  emptyLabel={t("filterAllGroups")}
                  disabled={groupOptions.length === 0}
                  portaled
                  className="w-full"
                  onChange={(v) => setUrl({ group: v || null, page: null })}
                />
                {groupsError ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{groupsError}</p>
                ) : null}
              </div>
            </div>
          }
        />
      ) : null}

      {!loading && !loadError && items.length > 0 ? (
        <div className="flex flex-col gap-3 border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("bulkBarLabel")}: <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{selectedIds.size}</span>
          </p>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-xs">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t("bulkMoveToGroup")}</span>
            <CheckmarkSelect
              listLabel={t("bulkMoveToGroup")}
              options={bulkGroupSelectOptions}
              value={bulkGroupId}
              emptyLabel={t("bulkGroupPlaceholder")}
              disabled={bulkAssigning || groupOptions.length === 0}
              portaled
              className="w-full"
              onChange={setBulkGroupId}
            />
          </div>
          <AppButton type="button" variant="secondary" size="md" loading={bulkAssigning} onClick={() => void applyBulkMove()}>
            {t("bulkApply")}
          </AppButton>
        </div>
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
                  onClick={() => setUrl({ search: null, group: null, page: null }, { replace: true })}
                >
                  {tList("clearFilters")}
                </AppButton>
              }
            />
          ) : (
            <DashboardEmptyState
              iconName="compositeItems"
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
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allPageSelected}
                onChange={toggleSelectAllPage}
                disabled={items.length === 0}
                className="size-4 rounded border-slate-300 text-[color:var(--dash-accent)] focus:ring-[color:var(--dash-accent)] dark:border-slate-600"
                aria-label={t("bulkBarLabel")}
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">{t("bulkBarLabel")}</span>
            </div>
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  leading={
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelected(row.id)}
                      className="size-4 rounded border-slate-300 text-[color:var(--dash-accent)] focus:ring-[color:var(--dash-accent)] dark:border-slate-600"
                      aria-label={`${t("bulkBarLabel")}: ${row.name}`}
                    />
                  }
                  title={row.name}
                  subtitle={groupLabelById[row.group] ?? `#${row.group}`}
                  meta={String(row.organization)}
                  description={[
                    row.is_active ? t("statusActive") : t("statusInactive"),
                    dateFmt.format(new Date(row.created_at)),
                  ].join(" · ")}
                  menu={
                    <DataTableRowActionsMenu
                      menuAriaLabel={tList("openRowActions")}
                      items={[
                        {
                          id: "edit",
                          label: t("edit"),
                          onSelect: () => openEdit(row),
                        },
                        {
                          id: "delete",
                          label: t("delete"),
                          tone: "danger",
                          onSelect: () => {
                            setDeletingItem(row);
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
          <DataTableScroll>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableTh narrow className="w-12">
                    <span className="sr-only">{t("bulkBarLabel")}</span>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAllPage}
                      disabled={items.length === 0}
                      className="size-4 rounded border-slate-300 text-[color:var(--dash-accent)] focus:ring-[color:var(--dash-accent)] dark:border-slate-600"
                      aria-label={t("bulkBarLabel")}
                    />
                  </DataTableTh>
                  <DataTableTh>{t("table.name")}</DataTableTh>
                  <DataTableTh className="hidden sm:table-cell">{t("table.group")}</DataTableTh>
                  <DataTableTh className="hidden md:table-cell">{t("table.organization")}</DataTableTh>
                  <DataTableTh className="hidden lg:table-cell">{t("table.created")}</DataTableTh>
                  <DataTableTh className="hidden xl:table-cell">{t("table.status")}</DataTableTh>
                  <DataTableTh narrow>
                    <span className="sr-only">{t("table.actions")}</span>
                  </DataTableTh>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {items.map((row) => (
                    <DataTableRow key={row.id}>
                      <DataTableTd narrow>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleSelected(row.id)}
                          className="size-4 rounded border-slate-300 text-[color:var(--dash-accent)] focus:ring-[color:var(--dash-accent)] dark:border-slate-600"
                          aria-label={`${t("bulkBarLabel")}: ${row.name}`}
                        />
                      </DataTableTd>
                      <DataTableTd className="font-semibold text-slate-900 dark:text-slate-100">{row.name}</DataTableTd>
                      <DataTableTd className="hidden text-slate-700 dark:text-slate-300 sm:table-cell">
                        {groupLabelById[row.group] ?? `#${row.group}`}
                      </DataTableTd>
                      <DataTableTd className="hidden tabular-nums text-slate-600 dark:text-slate-400 md:table-cell">
                        {row.organization}
                      </DataTableTd>
                      <DataTableTd className="hidden text-slate-600 dark:text-slate-400 lg:table-cell">
                        {dateFmt.format(new Date(row.created_at))}
                      </DataTableTd>
                      <DataTableTd className="hidden xl:table-cell">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            row.is_active
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                          )}
                        >
                          {row.is_active ? t("statusActive") : t("statusInactive")}
                        </span>
                      </DataTableTd>
                      <DataTableTd narrow>
                        <DataTableRowActionsMenu
                          menuAriaLabel={tList("openRowActions")}
                          items={[
                            {
                              id: "edit",
                              label: t("edit"),
                              onSelect: () => openEdit(row),
                            },
                            {
                              id: "delete",
                              label: t("delete"),
                              tone: "danger",
                              onSelect: () => {
                                setDeletingItem(row);
                                setDeleteOpen(true);
                              },
                            },
                          ]}
                        />
                      </DataTableTd>
                    </DataTableRow>
                  ))}
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

      <CompositeItemFormModal
        key={formKey}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        item={editingItem}
        groupOptions={groupOptions}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={deletingItem?.name}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
