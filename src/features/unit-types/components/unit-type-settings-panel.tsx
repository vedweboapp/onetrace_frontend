"use client";

import * as React from "react";
import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import {
  createUnitType,
  deleteUnitType,
  fetchUnitTypesPage,
  updateUnitType,
} from "@/features/unit-types/api/unit-type.api";
import type { UnitType } from "@/features/unit-types/types/unit-type.types";
import { formatUnitTypeLabel, formatUnitTypeShortLabel } from "@/features/unit-types/utils/unit-type-display.util";
import { zTrimmedNonEmpty } from "@/shared/form";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import {
  getApiErrorDisplayMessage,
  toastApiError,
  toastSuccess,
} from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useListActiveInactiveEmptyState } from "@/shared/hooks/use-list-active-inactive-empty";
import {
  hasListActiveFilters,
  parseIsActiveParam,
  useListUrlState,
} from "@/shared/hooks/use-list-url-state";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { routes } from "@/shared/config/routes";
import {
  ActiveStatusBadge,
  AddButton,
  AppButton,
  AppModal,
  ConfirmDialog,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  type DataTableRowMenuItem,
  ListPageActiveFilter,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageEmptyStates,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
  FieldGroup,
  listPageSurfaceShellClassName,
  surfaceInputClassName,
} from "@/shared/ui";

function unitTypeUserLabel(user: UnitType["created_by"]): string {
  if (!user) return "—";
  const name = user.username?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email;
  return `#${user.id}`;
}

function rowActionsMenu(
  row: UnitType,
  t: ReturnType<typeof useTranslations<"Dashboard.unitTypes">>,
  tList: ReturnType<typeof useTranslations<"Dashboard.list">>,
  opts: {
    onEdit: (row: UnitType) => void;
    onDelete: (row: UnitType) => void;
    onToggleActive: (row: UnitType, next: boolean) => void;
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

export function UnitTypeSettingsPanel() {
  const t = useTranslations("Dashboard.unitTypes");
  const tList = useTranslations("Dashboard.list");
  const tCustomization = useTranslations("Dashboard.settingsNav.customization");
  const dateFmt = useDashboardDateFormat();
  const { page, pageSize, listViewMode, search, isActiveParam, setUrl, setPage, setPageSize, setListViewMode } =
    useListUrlState();
  const isActiveFilter = parseIsActiveParam(isActiveParam) ?? true;

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  const [items, setItems] = React.useState<UnitType[]>([]);
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
  const [editing, setEditing] = React.useState<UnitType | null>(null);
  const [unitName, setUnitName] = React.useState("");
  const [unitShortForm, setUnitShortForm] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{ name?: string; shortForm?: string }>({});

  const [deleteTarget, setDeleteTarget] = React.useState<UnitType | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchUnitTypesPage(page, pageSize, {
          search: search || undefined,
          is_active: isActiveFilter,
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
  }, [page, pageSize, refreshNonce, search, isActiveFilter, t]);

  const hasActiveFilters = hasListActiveFilters({ search, isActiveParam });
  const countInactive = React.useCallback(async () => {
    const { pagination: p } = await fetchUnitTypesPage(1, 1, {
      search: search || undefined,
      is_active: false,
    });
    return p.total_records;
  }, [search]);
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

  const openEdit = React.useCallback((row: UnitType) => {
    setEditing(row);
    setUnitName(formatUnitTypeLabel(row));
    setUnitShortForm(row.short_form?.trim() ?? "");
    setIsActive(row.is_active);
    setErrors({});
    setFormOpen(true);
  }, []);

  function openCreate() {
    setEditing(null);
    setUnitName("");
    setUnitShortForm("");
    setIsActive(true);
    setErrors({});
    setFormOpen(true);
  }

  async function handleToggleActive(row: UnitType, next: boolean) {
    setTogglingId(row.id);
    try {
      await updateUnitType(row.id, { is_active: next });
      toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      toastApiError(error, t("toggleActiveError"));
    } finally {
      setTogglingId(null);
    }
  }

  const handleToggleActiveStable = React.useCallback(
    (row: UnitType, next: boolean) => void handleToggleActive(row, next),
    [t],
  );

  async function submitForm() {
    const formSchema = z.object({
      name: zTrimmedNonEmpty(t("validationName")),
      shortForm: zTrimmedNonEmpty(t("validationShortForm")),
    });
    const parsed = formSchema.safeParse({ name: unitName, shortForm: unitShortForm });
    if (!parsed.success) {
      const nextErrors: { name?: string; shortForm?: string } = {};
      for (const issue of parsed.error.issues) {
        if (String(issue.path[0] ?? "") === "name") {
          nextErrors.name = String(issue.message);
        }
        if (String(issue.path[0] ?? "") === "shortForm") {
          nextErrors.shortForm = String(issue.message);
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const { name, shortForm } = parsed.data;
    setSaving(true);
    try {
      if (editing) {
        await updateUnitType(editing.id, { name, short_form: shortForm, is_active: isActive });
        toastSuccess(t("saved"));
      } else {
        await createUnitType({ name, short_form: shortForm });
        toastSuccess(t("created"));
      }
      setFormOpen(false);
      if (!editing) setUrl({ page: null });
      setRefreshNonce((n) => n + 1);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUnitType(deleteTarget.id);
      toastSuccess(t("deleted"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

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
    const c = entityCol<UnitType>();
    return [
      c.primary("name", t("table.name"), (row) => formatUnitTypeLabel(row)),
      c.custom("short_form", t("table.shortForm"), (row) => formatUnitTypeShortLabel(row)),
      c.status("recordStatus", t("table.status"), (r) => r.is_active, t("status.active"), t("status.inactive")),
      c.custom(
        "created",
        t("table.created"),
        (row) => (
          <>
            <span className="block text-slate-500 dark:text-slate-400">
              {formatFlexibleApiDate(row.created_at, dateFmt)}
            </span>
            {unitTypeUserLabel(row.created_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {unitTypeUserLabel(row.created_by)}
              </span>
            ) : null}
          </>
        ),
        { responsive: "sm" },
      ),
      c.custom(
        "updated",
        t("table.updated"),
        (row) => (
          <>
            <span className="block text-slate-500 dark:text-slate-400">
              {formatFlexibleApiDate(row.modified_at, dateFmt)}
            </span>
            {unitTypeUserLabel(row.modified_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {unitTypeUserLabel(row.modified_by)}
              </span>
            ) : null}
          </>
        ),
        { responsive: "md" },
      ),
      c.actions("actions", t("table.actions"), (row) => rowActionsMenu(row, t, tList, actionOpts)),
    ];
  }, [t, tList, dateFmt, actionOpts]);

  return (
    <div className="space-y-6">
      {!hideListChrome ? (
        <ListPageHeader
          title={t("title")}
          description={t("subtitle")}
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
                placeholder={tList("searchPlaceholder")}
                ariaLabel={tList("searchAria")}
                className="sm:max-w-sm"
              />
              <ListPageActiveFilter
                activeLabel={t("status.active")}
                inactiveLabel={t("status.inactive")}
                filterLabel={t("filterState")}
                filterAriaLabel={t("filterState")}
                isActiveParam={isActiveParam}
                onChange={(active) =>
                  setUrl({ is_active: active ? null : "false", page: null }, { replace: true })
                }
              />
            </div>
          }
        />
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
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          )
        ) : items.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "projects",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
              action: <AddButton type="button" onClick={openCreate} />,
            }}
            onClearFilters={() =>
              setUrl({ search: null, is_active: null, page: null }, { replace: true })
            }
            onSwitchToInactive={switchToInactive}
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  title={formatUnitTypeLabel(row)}
                  meta={
                    <>
                      {t("table.updated")}: {formatFlexibleApiDate(row.modified_at, dateFmt)}
                      {unitTypeUserLabel(row.modified_by) !== "—"
                        ? ` · ${unitTypeUserLabel(row.modified_by)}`
                        : ""}
                    </>
                  }
                  description={`${t("table.created")}: ${formatFlexibleApiDate(row.created_at, dateFmt)}${
                    unitTypeUserLabel(row.created_by) !== "—"
                      ? ` · ${unitTypeUserLabel(row.created_by)}`
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
        titleId="unit-type-form-title"
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
        <div className="space-y-4">
          <FieldGroup
            label={
              <span>
                {t("modal.unitName")} <span className="text-red-500">*</span>
              </span>
            }
            htmlFor="unit-type-name"
          >
            <input
              id="unit-type-name"
              value={unitName}
              placeholder={t("modal.unitNamePlaceholder")}
              onChange={(e) => {
                setUnitName(capitalizeFirstLetter(e.target.value));
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={cn(
                surfaceInputClassName,
                errors.name && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              )}
              autoComplete="off"
            />
            {errors.name ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>
            ) : null}
          </FieldGroup>
          <FieldGroup
            label={
              <span>
                {t("modal.unitShortForm")} <span className="text-red-500">*</span>
              </span>
            }
            htmlFor="unit-type-short-form"
          >
            <input
              id="unit-type-short-form"
              value={unitShortForm}
              placeholder={t("modal.unitShortFormPlaceholder")}
              onChange={(e) => {
                setUnitShortForm(e.target.value);
                if (errors.shortForm) setErrors((prev) => ({ ...prev, shortForm: undefined }));
              }}
              className={cn(
                surfaceInputClassName,
                errors.shortForm && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              )}
              autoComplete="off"
            />
            {errors.shortForm ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.shortForm}</p>
            ) : null}
          </FieldGroup>
          {editing ? (
            <FieldGroup label={t("filterState")}>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={saving}
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
        highlight={deleteTarget ? formatUnitTypeLabel(deleteTarget) : undefined}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
