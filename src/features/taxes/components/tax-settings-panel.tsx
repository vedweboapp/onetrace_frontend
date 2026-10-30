"use client";

import * as React from "react";
import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import {
  createTax,
  deleteTax,
  fetchTaxesPage,
  updateTax,
} from "@/features/taxes/api/tax.api";
import type { Tax } from "@/features/taxes/types/tax.types";
import { formatTaxLabel, formatTaxPercentage } from "@/features/taxes/utils/tax-display.util";
import { reportLocalFormSubmitApiError, zTrimmedNonEmpty } from "@/shared/form";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import {
  getApiErrorDisplayMessage,
  toastApiError,
  toastSuccess,
} from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { useListUrlState } from "@/shared/hooks/use-list-url-state";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { routes } from "@/shared/config/routes";
import {
  DashboardLoadErrorState,
  ActiveStatusBadge,
  AddButton,
  AppButton,
  AppModal,
  ConfirmDialog,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  type DataTableRowMenuItem,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageEmptyStates,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
  FieldGroup,
  listPageSurfaceShellClassName,
  listPageRootClassName,
  surfaceInputClassName,
} from "@/shared/ui";

function taxUserLabel(user: Tax["created_by"]): string {
  if (!user) return "—";
  const name = user.username?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email;
  return `#${user.id}`;
}

function rowActionsMenu(
  row: Tax,
  t: ReturnType<typeof useTranslations<"Dashboard.taxes">>,
  tList: ReturnType<typeof useTranslations<"Dashboard.list">>,
  opts: {
    onEdit: (row: Tax) => void;
    onDelete: (row: Tax) => void;
    onToggleActive: (row: Tax, next: boolean) => void;
    togglingId: number | null;
  },
) {
  const items: DataTableRowMenuItem[] = [
    {
      id: "edit",
      label: t("edit"),
      icon: Pencil,
      onSelect: () => opts.onEdit(row),
    },
    row.is_active
      ? {
          id: "deactivate",
          label: t("deactivate"),
          icon: PowerOff,
          onSelect: () => opts.onToggleActive(row, false),
          disabled: opts.togglingId === row.id,
        }
      : {
          id: "activate",
          label: t("activate"),
          icon: Power,
          onSelect: () => opts.onToggleActive(row, true),
          disabled: opts.togglingId === row.id,
        },
  ];
  if (!row.is_system_generated) {
    items.push({
      id: "delete",
      label: t("delete"),
      icon: Trash2,
      tone: "danger",
      onSelect: () => opts.onDelete(row),
    });
  }
  return <DataTableRowActionsMenu menuAriaLabel={tList("openRowActions")} items={items} />;
}

export function TaxSettingsPanel() {
  const t = useTranslations("Dashboard.taxes");
  const tList = useTranslations("Dashboard.list");
  const tCustomization = useTranslations("Dashboard.settingsNav.customization");
  const dateFmt = useDashboardDateFormat();
  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } =
    useListUrlState();

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  const [items, setItems] = React.useState<Tax[]>([]);
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
  const [togglingId, setTogglingId] = React.useState<number | null>(null);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Tax | null>(null);
  const [taxName, setTaxName] = React.useState("");
  const [taxPercentage, setTaxPercentage] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{ tax_name?: string; tax_percentage?: string }>({});

  const [deleteTarget, setDeleteTarget] = React.useState<Tax | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const taxFormSchema = React.useMemo(
    () =>
      z.object({
        tax_name: zTrimmedNonEmpty(t("validationName")),
        tax_percentage: z.string().refine(
          (val) => {
            const num = parseFloat(val);
            return !Number.isNaN(num) && num >= 0 && num <= 100;
          },
          { message: t("validationPercentage") },
        ),
      }),
    [t],
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetchTaxesPage(page, pageSize, {
      search: search || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setPagination(res.pagination);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(getApiErrorDisplayMessage(err, t("loadError")));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, refreshNonce, t]);

  const openCreate = React.useCallback(() => {
    setEditing(null);
    setTaxName("");
    setTaxPercentage("");
    setIsActive(true);
    setErrors({});
    setFormOpen(true);
  }, []);

  const openEdit = React.useCallback((row: Tax) => {
    setEditing(row);
    setTaxName(row.tax_name || "");
    setTaxPercentage(row.tax_percentage !== undefined && row.tax_percentage !== null ? String(row.tax_percentage) : "");
    setIsActive(row.is_active);
    setErrors({});
    setFormOpen(true);
  }, []);

  const submitForm = async () => {
    const result = taxFormSchema.safeParse({
      tax_name: taxName,
      tax_percentage: taxPercentage,
    });

    if (!result.success) {
      const fieldErrors: { tax_name?: string; tax_percentage?: string } = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (path === "tax_name") fieldErrors.tax_name = issue.message;
        if (path === "tax_percentage") fieldErrors.tax_percentage = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateTax(editing.id, {
          tax_name: result.data.tax_name,
          tax_percentage: result.data.tax_percentage,
          is_active: isActive,
        });
        toastSuccess(t("saved"));
      } else {
        await createTax({
          tax_name: result.data.tax_name,
          tax_percentage: result.data.tax_percentage,
          is_active: isActive,
        });
        toastSuccess(t("created"));
      }
      setFormOpen(false);
      setRefreshNonce((n) => n + 1);
    } catch (err: unknown) {
      reportLocalFormSubmitApiError(err, setErrors, t("loadError"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActiveStable = React.useCallback(
    async (row: Tax, next: boolean) => {
      setTogglingId(row.id);
      try {
        await updateTax(row.id, { is_active: next });
        toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
        setRefreshNonce((n) => n + 1);
      } catch (err: unknown) {
        toastApiError(err, t("toggleActiveError"));
      } finally {
        setTogglingId(null);
      }
    },
    [t],
  );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTax(deleteTarget.id);
      toastSuccess(t("deleted"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  };

  const { emptyStateKind, hideListChrome, listLoading, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters: Boolean(search?.trim()),
  });

  const pageRange = getListPageRange(pagination);
  const actionOpts = React.useMemo(
    () => ({
      onEdit: openEdit,
      onDelete: setDeleteTarget,
      onToggleActive: handleToggleActiveStable,
      togglingId,
    }),
    [openEdit, handleToggleActiveStable, togglingId],
  );

  const tableColumns = React.useMemo(() => {
    const c = entityCol<Tax>();
    return [
      c.primary("tax_name", t("table.name"), (row) => row.tax_name),
      c.custom("tax_percentage", t("table.percentage"), (row) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
          {formatTaxPercentage(row)}
        </span>
      )),
      c.status("is_active", t("table.status"), (r) => r.is_active, t("status.active"), t("status.inactive")),
      c.custom(
        "created",
        t("table.created"),
        (row) => (
          <>
            <span className="block text-slate-500 dark:text-slate-400">
              {formatFlexibleApiDate(row.created_at, dateFmt)}
            </span>
            {taxUserLabel(row.created_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {taxUserLabel(row.created_by)}
              </span>
            ) : null}
          </>
        ),
        { responsive: "sm" },
      ),
      c.actions("actions", t("table.actions"), (row) => rowActionsMenu(row, t, tList, actionOpts)),
    ];
  }, [t, tList, dateFmt, actionOpts]);

  return (
    <div className={listPageRootClassName()}>
      {!hideListChrome ? (
        <ListPageHeader
          backHref={routes.dashboard.settingsCustomization}
          backAriaLabel={tCustomization("backToHub")}
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
                className="sm:max-w-sm"
              />
            </div>
          }
        />
      ) : null}

      <SurfaceShell className={listPageSurfaceShellClassName(hideListChrome)}>
        {loadError ? (
          <DashboardLoadErrorState
            message={loadError}
            onRetry={() => setRefreshNonce((n) => n + 1)}
          />
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
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          )
        ) : items.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "customization",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
            }}
            onClearFilters={() =>
              setUrl({ search: null, is_active: null, page: null }, { replace: true })
            }
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  title={row.tax_name}
                  meta={
                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Rate: {formatTaxPercentage(row)}
                    </span>
                  }
                  description={`${t("table.created")}: ${formatFlexibleApiDate(row.created_at, dateFmt)}${
                    taxUserLabel(row.created_by) !== "—"
                      ? ` · ${taxUserLabel(row.created_by)}`
                      : ""
                  }`}
                  footer={
                    <ActiveStatusBadge
                      active={row.is_active}
                      label={row.is_active ? t("status.active") : t("status.inactive")}
                    />
                  }
                  menu={rowActionsMenu(row, t, tList, actionOpts)}
                />
              ))}
            </ListPageCardGrid>
          </div>
        ) : (
          <EntityDataTable columns={tableColumns} rows={items} />
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

      <AppModal
        open={formOpen}
        onClose={() => (!saving ? setFormOpen(false) : undefined)}
        title={editing ? t("modal.editTitle") : t("modal.createTitle")}
        titleId="tax-form-title"
        closeOnBackdrop={!saving}
        isBusy={saving}
        footer={
          <>
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => setFormOpen(false)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="button" variant="primary" size="sm" loading={saving} onClick={() => void submitForm()}>
              {t("modal.save")}
            </AppButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FieldGroup
            label={
              <span>
                {t("modal.taxName")} <span className="text-red-500">*</span>
              </span>
            }
            htmlFor="tax-name-input"
          >
            <input
              id="tax-name-input"
              value={taxName}
              placeholder={t("modal.taxNamePlaceholder")}
              onChange={(e) => {
                setTaxName(sanitizeTitleInput(e.target.value));
                if (errors.tax_name) setErrors((prev) => ({ ...prev, tax_name: undefined }));
              }}
              className={cn(
                surfaceInputClassName,
                errors.tax_name && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              )}
              autoComplete="off"
            />
            {errors.tax_name ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.tax_name}</p>
            ) : null}
          </FieldGroup>

          <FieldGroup
            label={
              <span>
                {t("modal.taxPercentage")} (%) <span className="text-red-500">*</span>
              </span>
            }
            htmlFor="tax-percentage-input"
          >
            <div className="relative">
              <input
                id="tax-percentage-input"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxPercentage}
                placeholder={t("modal.taxPercentagePlaceholder")}
                onChange={(e) => {
                  setTaxPercentage(e.target.value);
                  if (errors.tax_percentage) setErrors((prev) => ({ ...prev, tax_percentage: undefined }));
                }}
                className={cn(
                  surfaceInputClassName,
                  "pr-8",
                  errors.tax_percentage && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                )}
                autoComplete="off"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                %
              </span>
            </div>
            {errors.tax_percentage ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.tax_percentage}</p>
            ) : null}
          </FieldGroup>

          {editing ? (
            <FieldGroup label={t("filterState")}>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={saving}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{isActive ? t("status.active") : t("status.inactive")}</span>
              </label>
            </FieldGroup>
          ) : null}
        </div>
      </AppModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => (!deleting ? setDeleteTarget(null) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={deleteTarget ? formatTaxLabel(deleteTarget) : undefined}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
