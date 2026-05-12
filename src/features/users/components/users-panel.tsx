"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchUsersPage } from "@/features/users/api/user.api";
import type { UserProfile } from "@/features/users/types/user.types";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  AppButton,
  DashboardEmptyState,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTablePaginationBar,
  DataTableRow,
  DataTableRowActionsMenu,
  DataTableScroll,
  DataTableTd,
  DataTableTh,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { buildDetailHrefWithListReturn } from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { cn } from "@/core/utils/http.util";

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
  const locale = useLocale();
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

  const hasActiveFilters = hasListActiveFilters({ search });
  const hideListChrome = !loadError && !loading && items.length === 0 && !hasActiveFilters;
  const pageRange = getListPageRange(pagination);
  const dateFmt = React.useMemo(
    () => new Intl.DateTimeFormat(locale === "es" ? "es" : "en", { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

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
          action={<AppButton type="button" variant="primary" size="md" onClick={() => router.push(`${pathname}/new?back=${encodeURIComponent(listHref)}`)} className="gap-2"><Plus className="size-4" strokeWidth={2} aria-hidden />{t("invite")}</AppButton>}
          controls={<ListPageSearchField value={search} onCommit={commitSearch} placeholder={tList("searchPlaceholder")} ariaLabel={tList("searchAria")} className="sm:max-w-sm" />}
        />
      ) : null}

      <SurfaceShell className={hideListChrome ? "rounded-none border-dashed" : "rounded-none"}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : loading ? (
          listViewMode === "list" ? <div className="p-4 sm:p-6"><ListPageCardGrid>{Array.from({ length: 6 }, (_, i) => <ListPageCardSkeleton key={i} />)}</ListPageCardGrid></div> : <div className="space-y-2 p-6"><div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /><div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
        ) : items.length === 0 ? (
          hasActiveFilters ? (
            <DashboardEmptyState iconName="noResults" title={tList("noResultsTitle")} description={tList("noResultsDescription")} action={<AppButton type="button" variant="secondary" size="md" onClick={() => setUrl({ search: null, page: null }, { replace: true })}>{tList("clearFilters")}</AppButton>} />
          ) : (
            <DashboardEmptyState iconName="clients" title={t("emptyTitle")} description={t("emptyDescription")} action={<AppButton type="button" variant="primary" size="md" onClick={() => router.push(`${pathname}/new?back=${encodeURIComponent(listHref)}`)} className="gap-2"><Plus className="size-4" strokeWidth={2} aria-hidden />{t("invite")}</AppButton>} />
          )
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
                  menu={<DataTableRowActionsMenu menuAriaLabel={tList("openRowActions")} items={[{ id: "edit", label: t("edit"), icon: Pencil, onSelect: () => router.push(`${pathname}/${row.id}/edit?back=${encodeURIComponent(listHref)}`) }]} />}
                />
              ))}
            </ListPageCardGrid>
          </div>
        ) : (
          <DataTableScroll>
            <DataTable>
              <DataTableHead><tr><DataTableTh>{t("table.name")}</DataTableTh><DataTableTh>{t("table.email")}</DataTableTh><DataTableTh>{t("table.phone")}</DataTableTh><DataTableTh>{t("table.role")}</DataTableTh><DataTableTh>{t("table.inviteStatus")}</DataTableTh><DataTableTh>{t("table.created")}</DataTableTh><DataTableTh narrow><span className="sr-only">{t("table.actions")}</span></DataTableTh></tr></DataTableHead>
              <DataTableBody>
                {items.map((row) => (
                  <DataTableRow key={row.id} data-list-row-id={row.id} className={cn(highlightClassName(row.id))} clickable onClick={() => openDetail(row.id)}>
                    <DataTableTd className="font-semibold text-slate-900 dark:text-slate-100">{fullName(row)}</DataTableTd>
                    <DataTableTd>{row.user_detail.email}</DataTableTd>
                    <DataTableTd>{row.user_detail.phone_number?.trim() || "—"}</DataTableTd>
                    <DataTableTd>{roleLabel(row)}</DataTableTd>
                    <DataTableTd>{row.user_detail.invite_status ?? "—"}</DataTableTd>
                    <DataTableTd>{dateFmt.format(new Date(row.created_at))}</DataTableTd>
                    <DataTableTd narrow onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <DataTableRowActionsMenu menuAriaLabel={tList("openRowActions")} items={[{ id: "edit", label: t("edit"), icon: Pencil, onSelect: () => router.push(`${pathname}/${row.id}/edit?back=${encodeURIComponent(listHref)}`) }]} />
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
