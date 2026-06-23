"use client";

import * as React from "react";
import { Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { deleteSite, fetchAllSiteIds, fetchSitesPage, patchSite } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import {
  MassActionBar,
  buildSiteMassUpdateFields,
  useEntityListMassActions,
} from "@/shared/mass-actions";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useListActiveInactiveEmptyState } from "@/shared/hooks/use-list-active-inactive-empty";
import { hasListActiveFilters, parseIsActiveParam, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  ActiveStatusBadge,
  AddButton,
  AppButton,
  CheckmarkSelect,
  ConfirmDialog,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  ListPageActiveFilter,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { buildDetailHrefWithListReturn, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
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

  const listFilters = React.useMemo(
    () => ({
      search: search || undefined,
      is_active: isActiveFilter,
      client: clientFilter,
    }),
    [search, isActiveFilter, clientFilter],
  );

  const massUpdateFields = React.useMemo(
    () =>
      buildSiteMassUpdateFields(clientOptions, {
        siteName: t("fields.siteName"),
        client: t("fields.client"),
        addressLine1: t("fields.addressLine1"),
        addressLine2: t("fields.addressLine2"),
        country: t("fields.country"),
        state: t("fields.stateProvince"),
        city: t("fields.city"),
        pincode: t("fields.pincode"),
        what3words: t("fields.what3words"),
        latitude: t("fields.latitude"),
        longitude: t("fields.longitude"),
        isActive: t("table.status"),
        activeLabel: t("status.active"),
        inactiveLabel: t("status.inactive"),
      }),
    [clientOptions, t],
  );

  const fetchAllIds = React.useCallback(() => fetchAllSiteIds(listFilters), [listFilters]);

  const mass = useEntityListMassActions({
    resource: "sites",
    totalRecords: pagination.total_records,
    pageItems: items,
    fetchAllIds,
    resetDeps: [pageSize, search, isActiveFilter, clientFilter],
    updateFields: massUpdateFields,
    onApplied: () => setRefreshNonce((n) => n + 1),
  });

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

  const hasActiveFilters = hasListActiveFilters({ search, isActiveParam, clientParam });
  const countInactive = React.useCallback(async () => {
    const { pagination: p } = await fetchSitesPage(1, 1, {
      search: search || undefined,
      is_active: false,
      client: clientFilter,
    });
    return p.total_records;
  }, [search, clientFilter]);
  const { hideListChrome, listLoading, emptyStateKind, filtersActive, switchToInactive } =
    useListActiveInactiveEmptyState({
      loading,
      loadError,
      itemsLength: items.length,
      isActiveParam,
      isActiveFilter,
      hasActiveFilters,
      setUrl,
      countInactive,
    });
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

  const tableColumns = React.useMemo(() => {
    const c = entityCol<Site>();
    return [
      c.selection(
        "select",
        (
          <input
            ref={mass.selection.selectAllRef}
            type="checkbox"
            className={mass.selection.rowCheckboxClassName}
            checked={mass.selection.allMatchingSelected}
            disabled={mass.selection.selectingAll || items.length === 0}
            aria-label={mass.selectAllAriaLabel}
            onChange={() => void mass.selection.toggleSelectAll()}
          />
        ),
        (row) => (
          <input
            type="checkbox"
            className={mass.selection.rowCheckboxClassName}
            checked={mass.selection.isSelected(row.id)}
            aria-label={mass.selectRowAriaLabel}
            onChange={() => mass.selection.toggleRowSelected(row.id)}
          />
        ),
        { narrow: true },
      ),
      c.primary("name", t("table.name"), (r) => r.site_name),
      c.text("client", t("table.client"), (r) => siteClientName(r, clientLabelById)),
      c.truncate("address", t("table.address"), (r) => r.address_line_1?.trim() || "—", { maxWidth: "md" }),
      c.truncate("what3words", t("table.what3words"), (r) => r.what3words?.trim() || "—", { maxWidth: "sm", responsive: "md" }),
      c.status("status", t("table.status"), (r) => r.is_active, t("status.active"), t("status.inactive")),
      c.date("created", t("table.created"), (r) => r.created_at, dateFmt),

    ];
  }, [t, tList, dateFmt, clientLabelById, togglingId, listHref, pathname, router, mass, items.length]);

  return (
    <div className="space-y-4">
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={filtersActive}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          action={
            <AppButton type="button" variant="primary" size="sm" onClick={() => router.push(buildPathWithStoredBack(`${pathname}/new`, listHref))}>
              {t("add")}
            </AppButton>
          }
          controls={
            <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
                searchable
                clearable
                clearAriaLabel={tList("clearFilter")}
                className="w-full min-w-0 sm:w-56"
                onChange={(v) => setUrl({ client: v || null, page: null }, { replace: true })}
              />
              <ListPageActiveFilter
                activeLabel={t("status.active")}
                inactiveLabel={t("status.inactive")}
                filterLabel={t("filterState")}
                filterAriaLabel={t("filterState")}
                isActiveParam={isActiveParam}
                onChange={(isActive) =>
                  setUrl({ is_active: isActive ? null : "false", page: null }, { replace: true })
                }
              />
            </div>
          }
        />
      ) : null}

      {mass.selectedCount > 0 && !listLoading && !loadError ? (
        <MassActionBar
          selectedIds={mass.selectedIds}
          config={mass.config}
          updateFields={mass.updateFields}
          onSuccess={mass.handleMassSuccess}
        />
      ) : null}

      <SurfaceShell className={listPageSurfaceShellClassName(hideListChrome)}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : listLoading ? (
          listViewMode === "list" ? (
            <div className="p-4 sm:p-6"><ListPageCardGrid>{Array.from({ length: 6 }, (_, i) => <ListPageCardSkeleton key={i} />)}</ListPageCardGrid></div>
          ) : (
            <div className="space-y-2 p-6"><div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /><div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /><div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
          )
        ) : items.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "projects",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
              action: (
                <AddButton
                  type="button"
                  onClick={() => router.push(buildPathWithStoredBack(`${pathname}/new`, listHref))}
                />
              ),
            }}
            onClearFilters={() =>
              setUrl({ search: null, is_active: null, client: null, page: null }, { replace: true })
            }
            onSwitchToInactive={switchToInactive}
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  dataListRowId={row.id}
                  className={highlightClassName(row.id)}
                  leading={
                    <input
                      type="checkbox"
                      className={mass.selection.rowCheckboxClassName}
                      checked={mass.selection.isSelected(row.id)}
                      aria-label={mass.selectRowAriaLabel}
                      onChange={() => mass.selection.toggleRowSelected(row.id)}
                    />
                  }
                  title={row.site_name}
                  subtitle={siteClientName(row, clientLabelById)}
                  meta={row.city?.trim() || row.state?.trim() || row.country?.trim() || "—"}
                  footer={<div className="flex w-full items-center justify-between gap-3"><ActiveStatusBadge active={row.is_active} label={row.is_active ? t("status.active") : t("status.inactive")} /><span className="text-xs text-slate-500 dark:text-slate-400">{tList("cardCreated", { date: dateFmt.format(new Date(row.created_at)) })}</span></div>}
                  onCardClick={() => openSiteDetail(row.id)}
                  menu={
                    <DataTableRowActionsMenu
                      menuAriaLabel={tList("openRowActions")}
                      items={[
                        { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => router.push(buildPathWithStoredBack(`${pathname}/${row.id}/edit`, listHref)) },
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
          <EntityDataTable
            columns={tableColumns}
            rows={items}
            onRowClick={(row) => openSiteDetail(row.id)}
            getRowClassName={(row) => highlightClassName(row.id)}
          />
        )}

        {!listLoading && !loadError && items.length > 0 ? (
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
