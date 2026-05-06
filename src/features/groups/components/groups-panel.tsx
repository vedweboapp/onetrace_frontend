"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deleteGroup, fetchGroup, fetchGroupsPage } from "@/features/groups/api/group.api";
import { GroupFormModal } from "@/features/groups/components/group-form-modal";
import type { Group } from "@/features/groups/types/group.types";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import {
  AppButton,
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
import { routes } from "@/shared/config/routes";

export function GroupsPanel() {
  const t = useTranslations("Dashboard.groups");
  const tList = useTranslations("Dashboard.list");
  const locale = useLocale();
  const router = useRouter();

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

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editingGroup, setEditingGroup] = React.useState<Group | null>(null);
  const [formKey, setFormKey] = React.useState(0);

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

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const hasActiveFilters = hasListActiveFilters({ search });
  const hideListChrome = !loadError && !loading && items.length === 0 && !hasActiveFilters;
  const pageRange = getListPageRange(pagination);

  function openCreate() {
    setFormMode("create");
    setEditingGroup(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  async function openEdit(row: Group) {
    setFormMode("edit");
    setEditingGroup(row);
    setFormKey((k) => k + 1);
    setFormOpen(true);
    try {
      const fullGroup = await fetchGroup(row.id);
      setEditingGroup(fullGroup);
    } catch {
      toastError(t("detailLoadError"));
    }
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
              iconName="groups"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <AppButton type="button" variant="primary" size="md" onClick={openCreate} className="gap-2">
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
                  title={row.name}
                  subtitle={
                    row.items && row.items.length > 0
                      ? t("compositeCount", { count: row.items.length })
                      : t("noCompositeLinked")
                  }
                  meta={dateFmt.format(new Date(row.created_at))}
                  description={
                    row.items && row.items.length > 0
                      ? row.items
                          .map((x) => `${x.item_name ?? `#${x.item}`} (${x.abbreviation})`)
                          .slice(0, 2)
                          .join(" · ")
                      : row.is_active
                        ? t("statusActive")
                        : t("statusInactive")
                  }
                  onCardClick={() => router.push(`${routes.dashboard.groups}/${row.id}`)}
                  menu={
                    <DataTableRowActionsMenu
                      menuAriaLabel={tList("openRowActions")}
                      items={[
                        {
                          id: "edit",
                          label: t("edit"),
                          onSelect: () => void openEdit(row),
                        },
                        {
                          id: "delete",
                          label: t("delete"),
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
          <DataTableScroll>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableTh>{t("table.name")}</DataTableTh>
                  <DataTableTh className="hidden sm:table-cell">{t("table.compositeItems")}</DataTableTh>
                  <DataTableTh className="hidden md:table-cell">{t("table.created")}</DataTableTh>
                  <DataTableTh className="hidden lg:table-cell">{t("table.status")}</DataTableTh>
                  <DataTableTh narrow>{t("table.actions")}</DataTableTh>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {items.map((row) => (
                    <DataTableRow key={row.id} clickable onClick={() => router.push(`${routes.dashboard.groups}/${row.id}`)}>
                      <DataTableTd className="font-semibold text-slate-900 dark:text-slate-100">{row.name}</DataTableTd>
                      <DataTableTd className="hidden tabular-nums text-slate-700 dark:text-slate-300 sm:table-cell">
                        {row.items && row.items.length > 0
                          ? row.items
                              .map((x) => `${x.item_name ?? `#${x.item}`} (${x.abbreviation})`)
                              .slice(0, 2)
                              .join(" · ")
                          : "—"}
                      </DataTableTd>
                      <DataTableTd className="hidden text-slate-600 dark:text-slate-400 md:table-cell">
                        {dateFmt.format(new Date(row.created_at))}
                      </DataTableTd>
                      <DataTableTd className="hidden lg:table-cell">
                        <span
                          className={
                            row.is_active
                              ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }
                        >
                          {row.is_active ? t("statusActive") : t("statusInactive")}
                        </span>
                      </DataTableTd>
                      <DataTableTd narrow onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <DataTableRowActionsMenu
                          menuAriaLabel={tList("openRowActions")}
                          items={[
                            {
                              id: "edit",
                              label: t("edit"),
                              onSelect: () => void openEdit(row),
                            },
                            {
                              id: "delete",
                              label: t("delete"),
                              tone: "danger",
                              onSelect: () => {
                                setDeletingGroup(row);
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
