"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  deleteUserGroup,
  fetchUserGroupsPage,
} from "@/features/user-groups/api/user-group.api";
import type { UserGroup } from "@/features/user-groups/types/user-group.types";
import {
  formatUserGroupLabel,
  formatUserGroupMemberLabel,
} from "@/features/user-groups/utils/user-group-display.util";
import { UsersSettingsTabs } from "@/features/users/components/users-settings-tabs";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { getApiErrorDisplayMessage, toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import {
  buildDetailHrefWithListReturn,
  buildPathWithStoredBack,
} from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import {
  AddButton,
  ConfirmDialog,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageEmptyStates,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
  listPageRootClassName,
  listPageSurfaceShellClassName,
} from "@/shared/ui";

export function UserGroupsPanel() {
  const t = useTranslations("Dashboard.userGroups");
  const tList = useTranslations("Dashboard.list");
  const dateFmt = useDashboardDateFormat();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { highlightClassName } = useListRowHighlight();
  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } = useListUrlState();

  const listHref = React.useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("highlight");
    const qs = p.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }, [pathname, searchParams]);

  const [items, setItems] = React.useState<UserGroup[]>([]);
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
  const [deleteTarget, setDeleteTarget] = React.useState<UserGroup | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  const openDetail = React.useCallback(
    (id: number) => {
      router.push(buildDetailHrefWithListReturn(`${pathname}/${id}`, listHref, id));
    },
    [listHref, pathname, router],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchUserGroupsPage(page, pageSize, {
          search: search || undefined,
        });
        if (!cancelled) {
          setItems(nextItems);
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
  }, [page, pageSize, search, refreshNonce, t]);

  const hasActiveFilters = hasListActiveFilters({ search });
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });
  const pageRange = getListPageRange(pagination);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUserGroup(deleteTarget.id);
      toastSuccess(t("deleted"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      toastApiError(error, t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  const tableColumns = React.useMemo(() => {
    const c = entityCol<UserGroup>();
    return [
      c.primary("name", t("table.name"), (row) => formatUserGroupLabel(row)),
      c.custom("members", t("table.members"), (row) => {
        const names = (row.users ?? []).map(formatUserGroupMemberLabel);
        if (names.length === 0) return t("table.noMembers");
        const shown = names.slice(0, 3).join(", ");
        return names.length > 3 ? `${shown} +${names.length - 3}` : shown;
      }),
      c.custom(
        "created",
        t("table.created"),
        (row) => (
          <span className="text-slate-500 dark:text-slate-400">
            {formatFlexibleApiDate(row.created_at, dateFmt)}
          </span>
        ),
        { responsive: "sm" },
      ),
      c.actions("actions", t("table.actions"), (row) => (
        <DataTableRowActionsMenu
          menuAriaLabel={tList("openRowActions")}
          items={[
            {
              id: "edit",
              label: t("edit"),
              icon: Pencil,
              onSelect: () => router.push(buildPathWithStoredBack(`${pathname}/${row.id}/edit`, listHref)),
            },
            {
              id: "delete",
              label: t("delete"),
              icon: Trash2,
              tone: "danger",
              onSelect: () => setDeleteTarget(row),
            },
          ]}
        />
      )),
    ];
  }, [t, tList, dateFmt, router, pathname, listHref]);

  return (
    <div className={listPageRootClassName()}>
      {!hideListChrome ? (
        <>
          <UsersSettingsTabs />
          <ListPageHeader
            filtersActive={filtersActive}
            viewMode={listViewMode}
            onViewModeChange={setListViewMode}
            tableViewLabel={tList("tableView")}
            listViewLabel={tList("listView")}
            action={
              <AddButton
                type="button"
                onClick={() => router.push(buildPathWithStoredBack(`${pathname}/new`, listHref))}
              />
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
        </>
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
              iconName: "clients",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
              action: (
                <AddButton
                  type="button"
                  onClick={() => router.push(buildPathWithStoredBack(`${pathname}/new`, listHref))}
                />
              ),
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
                  title={formatUserGroupLabel(row)}
                  meta={`${t("table.members")}: ${row.users?.length ?? 0}`}
                  description={`${t("table.created")}: ${formatFlexibleApiDate(row.created_at, dateFmt)}`}
                  onCardClick={() => openDetail(row.id)}
                  menu={
                    <DataTableRowActionsMenu
                      menuAriaLabel={tList("openRowActions")}
                      items={[
                        {
                          id: "edit",
                          label: t("edit"),
                          icon: Pencil,
                          onSelect: () =>
                            router.push(buildPathWithStoredBack(`${pathname}/${row.id}/edit`, listHref)),
                        },
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
          />
        )}

        {!loading && !loadError && items.length > 0 ? (
          <DataTablePaginationBar
            pagination={pagination}
            summary={t("pageLabel", { start: pageRange.start, end: pageRange.end, total: pagination.total_records })}
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
        highlight={deleteTarget ? formatUserGroupLabel(deleteTarget) : undefined}
        confirmLabel={t("delete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
