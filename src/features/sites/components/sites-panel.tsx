"use client";

import * as React from "react";
import { Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { deleteSite, fetchSitesPage, patchSite } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { hasListActiveFilters, parseIsActiveParam, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  ActiveStatusBadge,
  AppButton,
  CheckmarkSelect,
  ConfirmDialog,
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

function siteClientId(row: Site): number | null {
  if (typeof row.client === "number" && Number.isFinite(row.client) && row.client > 0) return row.client;
  if (row.client && typeof row.client === "object" && Number.isFinite(row.client.id) && row.client.id > 0) {
    return row.client.id;
  }
  return null;
}

function siteClientName(row: Site, clientNameById: Record<number, string>): string {
  if (row.client && typeof row.client === "object" && row.client.name?.trim()) return row.client.name.trim();
  const id = siteClientId(row);
  if (id && clientNameById[id]) return clientNameById[id];
  return id ? `#${id}` : "—";
}

export function SitesPanel() {
  const t = useTranslations("Dashboard.sites");
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

  const openSiteDetail = React.useCallback(
    (id: number) => {
      router.push(buildDetailHrefWithListReturn(`${pathname}/${id}`, listHref, id));
    },
    [listHref, pathname, router],
  );

  const { page, pageSize, listViewMode, search, isActiveParam, setUrl, setPage, setPageSize, setListViewMode } =
    useListUrlState();
  const isActiveFilter = parseIsActiveParam(isActiveParam) ?? true;
  const clientParam = searchParams.get("client");
  const clientFilter = clientParam && /^\d+$/.test(clientParam) ? Number.parseInt(clientParam, 10) : undefined;

  const [items, setItems] = React.useState<Site[]>([]);
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
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingSite, setDeletingSite] = React.useState<Site | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<number | null>(null);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const stateFilterOptions = React.useMemo(
    () => [
      { value: "true", label: t("status.active") },
      { value: "false", label: t("status.inactive") },
    ],
    [t],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: clients } = await fetchClientsPage(1, 500, { is_active: true });
        if (!cancelled) setClientOptions(clients.map((c) => ({ value: String(c.id), label: c.name })));
      } catch {
        if (!cancelled) setClientOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchSitesPage(page, pageSize, {
          search: search || undefined,
          is_active: isActiveFilter,
          client: clientFilter,
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
  }, [page, pageSize, search, isActiveFilter, clientFilter, refreshNonce, t]);

  const clientLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of clientOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [clientOptions]);

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const hasActiveFilters = hasListActiveFilters({ search, isActiveParam, clientParam });
  const hideListChrome = !loadError && !loading && items.length === 0 && !hasActiveFilters;
  const pageRange = getListPageRange(pagination);

  async function handleToggleActive(row: Site, next: boolean) {
    setTogglingId(row.id);
    try {
      await patchSite(row.id, { is_active: next });
      toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
      setRefreshNonce((n) => n + 1);
    } catch {
      toastError(t("toggleActiveError"));
    } finally {
      setTogglingId(null);
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
            <AppButton type="button" variant="primary" size="md" onClick={() => router.push(`${pathname}/new?back=${encodeURIComponent(listHref)}`)} className="gap-2">
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              {t("add")}
            </AppButton>
          }
          controls={
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ListPageSearchField
                value={search}
                onCommit={(q) => setUrl({ search: q.trim() || null, page: null }, { replace: true })}
                placeholder={tList("searchPlaceholder")}
                ariaLabel={tList("searchAria")}
                className="sm:max-w-sm"
              />
              <CheckmarkSelect
                listLabel={t("filterClient")}
                buttonAriaLabel={t("filterClient")}
                options={clientOptions}
                value={clientParam ?? ""}
                emptyLabel={t("filterAllClients")}
                portaled
                clearable
                clearAriaLabel={tList("clearFilter")}
                className="w-full min-w-0 sm:w-56"
                onChange={(v) => setUrl({ client: v || null, page: null }, { replace: true })}
              />
              <CheckmarkSelect
                listLabel={t("filterState")}
                buttonAriaLabel={t("filterState")}
                options={stateFilterOptions}
                value={isActiveParam === "false" ? "false" : "true"}
                emptyLabel={t("status.active")}
                portaled
                className="w-full min-w-0 sm:w-44"
                onChange={(v) => setUrl({ is_active: v === "false" ? "false" : null, page: null }, { replace: true })}
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
            <div className="p-4 sm:p-6"><ListPageCardGrid>{Array.from({ length: 6 }, (_, i) => <ListPageCardSkeleton key={i} />)}</ListPageCardGrid></div>
          ) : (
            <div className="space-y-2 p-6"><div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /><div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /><div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
          )
        ) : items.length === 0 ? (
          hasActiveFilters ? (
            <DashboardEmptyState
              iconName="noResults"
              title={tList("noResultsTitle")}
              description={tList("noResultsDescription")}
              action={<AppButton type="button" variant="secondary" size="md" onClick={() => setUrl({ search: null, is_active: null, client: null, page: null }, { replace: true })}>{tList("clearFilters")}</AppButton>}
            />
          ) : (
            <DashboardEmptyState
              iconName="projects"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={<AppButton type="button" variant="primary" size="md" onClick={() => router.push(`${pathname}/new?back=${encodeURIComponent(listHref)}`)} className="gap-2"><Plus className="size-4" strokeWidth={2} aria-hidden />{t("add")}</AppButton>}
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
                  title={row.site_name}
                  subtitle={siteClientName(row, clientLabelById)}
                  meta={row.city?.trim() || row.state?.trim() || row.country?.trim() || "—"}
                  footer={<div className="flex w-full items-center justify-between gap-3"><ActiveStatusBadge active={row.is_active} label={row.is_active ? t("status.active") : t("status.inactive")} /><span className="text-xs text-slate-500 dark:text-slate-400">{tList("cardCreated", { date: dateFmt.format(new Date(row.created_at)) })}</span></div>}
                  onCardClick={() => openSiteDetail(row.id)}
                  menu={
                    <DataTableRowActionsMenu
                      menuAriaLabel={tList("openRowActions")}
                      items={[
                        { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => router.push(`${pathname}/${row.id}/edit?back=${encodeURIComponent(listHref)}`) },
                        { id: "delete", label: t("delete"), icon: Trash2, tone: "danger", onSelect: () => { setDeletingSite(row); setDeleteOpen(true); } },
                        row.is_active
                          ? {
                              id: "deactivate",
                              label: t("deactivate"),
                              icon: PowerOff,
                              onSelect: () => void handleToggleActive(row, false),
                              disabled: togglingId === row.id,
                            }
                          : {
                              id: "activate",
                              label: t("activate"),
                              icon: Power,
                              onSelect: () => void handleToggleActive(row, true),
                              disabled: togglingId === row.id,
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
                  <DataTableTh>{t("table.client")}</DataTableTh>
                  <DataTableTh>{t("table.address")}</DataTableTh>
                  <DataTableTh>{t("table.status")}</DataTableTh>
                  <DataTableTh>{t("table.created")}</DataTableTh>
                  <DataTableTh narrow><span className="sr-only">{t("table.actions")}</span></DataTableTh>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {items.map((row) => (
                  <DataTableRow key={row.id} data-list-row-id={row.id} className={cn(highlightClassName(row.id))} clickable onClick={() => openSiteDetail(row.id)}>
                    <DataTableTd className="font-semibold text-slate-900 dark:text-slate-100">{row.site_name}</DataTableTd>
                    <DataTableTd>{siteClientName(row, clientLabelById)}</DataTableTd>
                    <DataTableTd className="max-w-[16rem] truncate">{row.address_line_1?.trim() || "—"}</DataTableTd>
                    <DataTableTd><ActiveStatusBadge active={row.is_active} label={row.is_active ? t("status.active") : t("status.inactive")} /></DataTableTd>
                    <DataTableTd>{dateFmt.format(new Date(row.created_at))}</DataTableTd>
                    <DataTableTd narrow onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <DataTableRowActionsMenu
                        menuAriaLabel={tList("openRowActions")}
                        items={[
                          { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => router.push(`${pathname}/${row.id}/edit?back=${encodeURIComponent(listHref)}`) },
                          { id: "delete", label: t("delete"), icon: Trash2, tone: "danger", onSelect: () => { setDeletingSite(row); setDeleteOpen(true); } },
                          row.is_active
                            ? {
                                id: "deactivate",
                                label: t("deactivate"),
                                icon: PowerOff,
                                onSelect: () => void handleToggleActive(row, false),
                                disabled: togglingId === row.id,
                              }
                            : {
                                id: "activate",
                                label: t("activate"),
                                icon: Power,
                                onSelect: () => void handleToggleActive(row, true),
                                disabled: togglingId === row.id,
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

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={() => void (async () => { if (!deletingSite) return; setDeleting(true); try { await deleteSite(deletingSite.id); toastSuccess(t("deletedToast")); setDeleteOpen(false); setDeletingSite(null); setRefreshNonce((n) => n + 1); } catch { toastError(t("deleteError")); } finally { setDeleting(false); } })()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={deletingSite?.site_name}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
