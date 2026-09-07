"use client";

import * as React from "react";
import { Pencil, Phone, Power, PowerOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { deleteVendor, fetchAllVendorIds, fetchVendorsPage, updateVendor } from "@/features/vendors/api/vendor.api";
import type { Vendor } from "@/features/vendors/types/vendor.types";
import { fetchVendorTypesPage } from "@/features/vendor-types/api/vendor-type.api";
import { VendorTypeChipGroup } from "@/features/vendor-types/components/vendor-type-chip";
import {
  getVendorTypeRows,
} from "@/features/vendors/utils/vendor-nested-fields.util";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { toastSuccess, toastApiError, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useDeferredListOptions } from "@/shared/hooks/use-deferred-list-options";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  MassActionBar,
  buildVendorMassUpdateFields,
  massSelectionColumn,
  useEntityListMassActions,
} from "@/shared/mass-actions";
import {
  AddButton,
  ConfirmDialog,
  DataTablePaginationBar,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  listPageRootClassName,
  listPageCardScrollClassName,
  DataTableRowActionsMenu,
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

export function VendorsPanel() {
  const t = useTranslations("Dashboard.vendors");
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

  const openDetail = React.useCallback(
    (id: number) => {
      router.push(buildDetailHrefWithListReturn(`${pathname}/${id}`, listHref, id));
    },
    [listHref, pathname, router],
  );

  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } =
    useListUrlState();

  const [items, setItems] = React.useState<Vendor[]>([]);
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
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingVendor, setDeletingVendor] = React.useState<Vendor | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<number | null>(null);
  const [fetchTypeOptions, setFetchTypeOptions] = React.useState(false);
  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const loadTypeOptions = React.useCallback(async () => {
    const { items: types } = await fetchVendorTypesPage(1, 200, { is_active: true });
    return types.map((row) => ({ value: String(row.id), label: row.name }));
  }, []);

  const { options: typeOptions } = useDeferredListOptions(loadTypeOptions, fetchTypeOptions);

  const listFilters = React.useMemo(
    () => ({
      search: search || undefined,
    }),
    [search],
  );

  const massUpdateFields = React.useMemo(
    () =>
      buildVendorMassUpdateFields(typeOptions, {
        name: t("fields.name"),
        email: t("fields.email"),
        phone: t("fields.phone"),
        type: t("fields.type"),
        addressLine1: t("fields.addressLine1"),
        addressLine2: t("fields.addressLine2"),
        country: t("fields.country"),
        state: t("fields.stateProvince"),
        city: t("fields.city"),
        pincode: t("fields.pincode"),
        isActive: t("table.status"),
        activeLabel: t("status.active"),
        inactiveLabel: t("status.inactive"),
      }),
    [t, typeOptions],
  );

  const fetchAllIds = React.useCallback(
    () => fetchAllVendorIds(listFilters, { silent: true }),
    [listFilters],
  );

  const mass = useEntityListMassActions({
    resource: "vendors",
    totalRecords: pagination.total_records,
    pageItems: items,
    fetchAllIds,
    resetDeps: [pageSize, search],
    updateFields: massUpdateFields,
    onApplied: () => setRefreshNonce((n) => n + 1),
  });

  React.useEffect(() => {
    if (mass.selectedCount > 0) setFetchTypeOptions(true);
  }, [mass.selectedCount]);

  const massSel = React.useMemo(() => massSelectionColumn(mass, items.length), [mass, items.length]);

  const commitSearch = React.useCallback(
    (q: string) => {
      setUrl({ search: q.trim() || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchVendorsPage(page, pageSize, {
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

  function openCreate() {
    router.push(buildPathWithStoredBack(`${pathname}/new`, listHref));
  }

  function openEdit(row: Vendor) {
    router.push(buildPathWithStoredBack(`${pathname}/${row.id}/edit`, listHref));
  }

  async function confirmDelete() {
    if (!deletingVendor) return;
    setDeleting(true);
    try {
      await deleteVendor(deletingVendor.id);
      toastSuccess(t("deletedToast"));
      setDeleteOpen(false);
      setDeletingVendor(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(row: Vendor, next: boolean) {
    setTogglingId(row.id);
    try {
      await updateVendor(row.id, { is_active: next });
      toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      toastApiError(error, t("toggleActiveError"));
    } finally {
      setTogglingId(null);
    }
  }

  const rowMenuItems = React.useCallback(
    (row: Vendor) => [
      { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row) },
      {
        id: "delete",
        label: t("delete"),
        icon: Trash2,
        tone: "danger" as const,
        onSelect: () => {
          setDeletingVendor(row);
          setDeleteOpen(true);
        },
      },
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
    ],
    [t, togglingId],
  );

  const tableColumns = React.useMemo(() => {
    const c = entityCol<Vendor>();
    return [
      massSel.tableColumn,
      c.primary("name", t("table.name"), (r) => r.name),
      c.custom("type", t("table.type"), (row) => {
        const typeRows = getVendorTypeRows(row);
        if (typeRows.length === 0) return "—";
        return <VendorTypeChipGroup rows={typeRows} />;
      }, { cellClassName: "min-w-[11rem]" }),
      c.truncate("email", t("table.email"), (r) => r.email),
      c.phone("phone", t("table.phone"), (r) => r.phone),
      c.date("created", t("table.created"), (r) => r.created_at, dateFmt),
    ];
  }, [t, dateFmt, massSel.tableColumn]);

  const hasActiveFilters = hasListActiveFilters({ search });
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });
  const pageRange = getListPageRange(pagination);

  return (
    <div className={listPageRootClassName()}>
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={filtersActive}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          action={<AddButton type="button" onClick={openCreate} />}
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
            <div className={listPageCardScrollClassName()}>
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
              action: <AddButton type="button" onClick={openCreate} />,
            }}
            onClearFilters={() => setUrl({ search: null, is_active: null, page: null }, { replace: true })}
          />
        ) : listViewMode === "list" ? (
          <div className={listPageCardScrollClassName()}>
            <ListPageCardGrid>
              {items.map((row) => {
                const typeRows = getVendorTypeRows(row);
                return (
                  <ListPageCard
                    key={row.id}
                    dataListRowId={row.id}
                    className={highlightClassName(row.id)}
                    leading={massSel.cardLeading(row)}
                    title={row.name}
                    subtitle={row.email}
                    footer={
                      <div className="flex w-full flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          {typeRows.length > 0 ? <VendorTypeChipGroup rows={typeRows} maxVisible={3} /> : null}
                        </div>
                        {row.phone?.trim() ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                            <Phone className="size-3.5" aria-hidden />
                            {row.phone}
                          </span>
                        ) : null}
                      </div>
                    }
                    onCardClick={() => openDetail(row.id)}
                    menu={<DataTableRowActionsMenu menuAriaLabel={tList("openRowActions")} items={rowMenuItems(row)} />}
                  />
                );
              })}
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

        {!listLoading && !loadError && items.length > 0 ? (
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
              disabled: listLoading,
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
        highlight={deletingVendor?.name}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
