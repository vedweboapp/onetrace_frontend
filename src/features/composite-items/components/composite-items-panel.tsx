"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { parseGroupIdParam, useListUrlState } from "@/shared/hooks/use-list-url-state";
import {
  AppButton,
  CheckmarkSelect,
  ConfirmDialog,
  DataTable,
  DataTableBody,
  DataTableEmptyRow,
  DataTableHead,
  DataTablePaginationBar,
  DataTableRow,
  DataTableScroll,
  DataTableTd,
  DataTableTh,
  ListPageSearchField,
  SurfaceShell,
  TableIconActionButton,
  TableRowActions,
} from "@/shared/ui";

export function CompositeItemsPanel() {
  const t = useTranslations("Dashboard.compositeItems");
  const tList = useTranslations("Dashboard.list");
  const locale = useLocale();

  const { page, search, groupParam, setUrl, setPage } = useListUrlState();
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
    setSelectedIds(new Set());
  }, [page, filterGroupId, search]);

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
        const { items: rows, pagination: p } = await fetchCompositeItemsPage(page, 20, {
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
  }, [page, filterGroupId, search, refreshNonce, t]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <ListPageSearchField
            value={search}
            onCommit={commitSearch}
            placeholder={tList("searchPlaceholder")}
            ariaLabel={tList("searchAria")}
          />
          <div className="min-w-0 sm:w-56">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("filterGroup")}</span>
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
            {groupsError ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{groupsError}</p> : null}
          </div>
        </div>
        <AppButton type="button" variant="primary" size="md" className="shrink-0 gap-2 self-start lg:self-center" onClick={openCreate}>
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          {t("add")}
        </AppButton>
      </div>

      {!loading && !loadError && items.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
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

      <SurfaceShell>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : loading ? (
          <div className="space-y-2 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
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
                  <DataTableTh narrow>{t("table.actions")}</DataTableTh>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {items.length === 0 ? (
                  <DataTableEmptyRow message={t("empty")} colSpan={7} />
                ) : (
                  items.map((row) => (
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
                      <DataTableTd className="font-medium text-slate-900 dark:text-slate-100">{row.name}</DataTableTd>
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
                      <DataTableTd narrow className="align-middle">
                        <TableRowActions>
                          <TableIconActionButton
                            label={t("edit")}
                            variant="secondary"
                            onClick={() => openEdit(row)}
                            icon={<Pencil strokeWidth={2} />}
                          />
                          <TableIconActionButton
                            label={t("delete")}
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                            onClick={() => {
                              setDeletingItem(row);
                              setDeleteOpen(true);
                            }}
                            icon={<Trash2 strokeWidth={2} />}
                          />
                        </TableRowActions>
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
              current: pagination.current_page,
              total: pagination.total_pages,
              count: pagination.total_records,
            })}
            prevLabel={t("prev")}
            nextLabel={t("next")}
            onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
            onNext={() => setPage(pagination.current_page + 1)}
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
