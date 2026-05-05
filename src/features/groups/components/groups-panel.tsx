"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/core/utils/http.util";
import { deleteGroup, fetchGroupsPage } from "@/features/groups/api/group.api";
import { GroupFormModal } from "@/features/groups/components/group-form-modal";
import type { Group } from "@/features/groups/types/group.types";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { useListUrlState } from "@/shared/hooks/use-list-url-state";
import {
  AppButton,
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

export function GroupsPanel() {
  const t = useTranslations("Dashboard.groups");
  const tList = useTranslations("Dashboard.list");
  const locale = useLocale();

  const { page, search, setUrl, setPage } = useListUrlState();

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

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editingGroup, setEditingGroup] = React.useState<Group | null>(null);
  const [formKey, setFormKey] = React.useState(0);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingGroup, setDeletingGroup] = React.useState<Group | null>(null);
  const [deleting, setDeleting] = React.useState(false);

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
        const { items: nextItems, pagination: p } = await fetchGroupsPage(page, 20, {
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
  }, [page, search, refreshNonce, t]);

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
    setEditingGroup(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function openEdit(row: Group) {
    setFormMode("edit");
    setEditingGroup(row);
    setFormKey((k) => k + 1);
    setFormOpen(true);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <ListPageSearchField
          value={search}
          onCommit={commitSearch}
          placeholder={tList("searchPlaceholder")}
          ariaLabel={tList("searchAria")}
          className="sm:max-w-sm"
        />
        <AppButton type="button" variant="primary" size="md" onClick={openCreate} className="shrink-0 gap-2 self-start sm:self-center">
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          {t("add")}
        </AppButton>
      </div>

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
                  <DataTableTh>{t("table.name")}</DataTableTh>
                  <DataTableTh className="hidden sm:table-cell">{t("table.organization")}</DataTableTh>
                  <DataTableTh className="hidden md:table-cell">{t("table.created")}</DataTableTh>
                  <DataTableTh className="hidden lg:table-cell">{t("table.status")}</DataTableTh>
                  <DataTableTh narrow>{t("table.actions")}</DataTableTh>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {items.length === 0 ? (
                  <DataTableEmptyRow message={t("empty")} colSpan={5} />
                ) : (
                  items.map((row) => (
                    <DataTableRow key={row.id}>
                      <DataTableTd className="font-medium text-slate-900 dark:text-slate-100">{row.name}</DataTableTd>
                      <DataTableTd className="hidden tabular-nums text-slate-700 dark:text-slate-300 sm:table-cell">
                        {row.organization}
                      </DataTableTd>
                      <DataTableTd className="hidden text-slate-600 dark:text-slate-400 md:table-cell">
                        {dateFmt.format(new Date(row.created_at))}
                      </DataTableTd>
                      <DataTableTd className="hidden lg:table-cell">
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
                              setDeletingGroup(row);
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

      <GroupFormModal
        key={formKey}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        group={editingGroup}
        onSaved={handleSaved}
      />

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
