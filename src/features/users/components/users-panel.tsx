"use client";

import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchUsersPage } from "@/features/users/api/user.api";
import type { UserProfile } from "@/features/users/types/user.types";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import {
  AddButton,
  AppButton,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  listPageRootClassName,
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
import { buildDetailHrefWithListReturn, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";

function fullName(row: UserProfile) {
  const first = row.user_detail.first_name?.trim() ?? "";
  const last = row.user_detail.last_name?.trim() ?? "";
  return `${first} ${last}`.trim() || row.user_detail.email;
}

function roleLabel(row: UserProfile): string {
  return row.role_detail?.role_name?.trim() || row.role_detail?.name?.trim() || "—";
}

export function UsersPanel() {
  const t = useTranslations("Dashboard.users");
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

  const [items, setItems] = React.useState<UserProfile[]>([]);
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
  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const commitSearch = React.useCallback((q: string) => {
    const trimmed = q.trim();
    setUrl({ search: trimmed || null, page: null }, { replace: true });
  }, [setUrl]);

  const openDetail = React.useCallback((id: number) => {
    router.push(buildDetailHrefWithListReturn(`${pathname}/${id}`, listHref, id));
  }, [listHref, pathname, router]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchUsersPage(page, pageSize, { search: search || undefined });
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

  const tableColumns = React.useMemo(() => {
    const c = entityCol<UserProfile>();
    return [
      c.primary("name", t("table.name"), (r) => fullName(r)),
      c.truncate("email", t("table.email"), (r) => r.user_detail.email, { title: (r) => r.user_detail.email }),
      c.phone("phone", t("table.phone"), (r) => r.user_detail.phone_number),
      c.text("role", t("table.role"), (r) => roleLabel(r)),
      c.text("invite", t("table.inviteStatus"), (r) => r.user_detail.invite_status ?? "—"),
      c.date("created", t("table.created"), (r) => r.created_at, dateFmt),
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
          ]}
        />
      )),
    ];
  }, [t, tList, dateFmt, router, pathname, listHref]);

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
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => router.push(buildPathWithStoredBack(`${pathname}/new`, listHref))}
             
            >
              {t("invite")}
            </AppButton>
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

      <SurfaceShell className={listPageSurfaceShellClassName(hideListChrome)}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : listLoading ? (
          listViewMode === "list" ? <div className="p-4 sm:p-6"><ListPageCardGrid>{Array.from({ length: 6 }, (_, i) => <ListPageCardSkeleton key={i} />)}</ListPageCardGrid></div> : <div className="space-y-2 p-6"><div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /><div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
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
                  title={fullName(row)}
                  subtitle={row.user_detail.email}
                  meta={roleLabel(row)}
                  description={`${t("fields.inviteStatus")}: ${row.user_detail.invite_status ?? "—"}`}
                  footer={<span className="text-xs text-slate-500 dark:text-slate-400">{tList("cardCreated", { date: dateFmt.format(new Date(row.created_at)) })}</span>}
                  onCardClick={() => openDetail(row.id)}
                  menu={<DataTableRowActionsMenu menuAriaLabel={tList("openRowActions")} items={[{ id: "edit", label: t("edit"), icon: Pencil, onSelect: () => router.push(buildPathWithStoredBack(`${pathname}/${row.id}/edit`, listHref)) }]} />}
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
            pageSizeControl={{ label: tList("rowsPerPage"), listLabel: tList("rowsPerPage"), value: pageSize, options: pageSizeOptions, onChange: setPageSize, disabled: loading }}
          />
        ) : null}
      </SurfaceShell>
    </div>
  );
}
