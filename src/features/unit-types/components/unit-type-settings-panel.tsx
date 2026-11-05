"use client";

import * as React from "react";
import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import {
  createUnitType,
  deleteUnitType,
  fetchUnitType,
  fetchUnitTypesPage,
  updateUnitType,
} from "@/features/unit-types/api/unit-type.api";
import type { UnitType } from "@/features/unit-types/types/unit-type.types";
import { formatUnitTypeLabel, formatUnitTypeShortLabel } from "@/features/unit-types/utils/unit-type-display.util";
import { reportLocalFormSubmitApiError, zTrimmedNonEmpty } from "@/shared/form";
import { DuplicateEntryFieldError } from "@/shared/form/components/duplicate-entry-field-error";
import { useDuplicateEntryConflict } from "@/shared/form/hooks/use-duplicate-entry-conflict";
import { settingsRecordHref, useOpenSettingsRecord } from "@/shared/form/settings-record-query";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import {
  SettingsDetailActions,
  SettingsDetailList,
  SettingsDetailRow,
  SettingsDetailTextValue,
  SettingsDetailTimestampValue,
  SettingsDetailTitle,
  settingsDetailUserLabel,
} from "@/shared/components/settings/settings-detail-view";
import {
  getApiErrorDisplayMessage,
  toastApiError,
  toastSuccess,
} from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
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
  DetailPanel,
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
  const [detailRow, setDetailRow] = React.useState<UnitType | null>(null);
  useOpenSettingsRecord(fetchUnitType, setDetailRow);
  const duplicate = useDuplicateEntryConflict({
    getDetailHref: (existingId) => settingsRecordHref(routes.dashboard.settingsUnitTypes, existingId),
  });
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
  }, [page, pageSize, refreshNonce, search, t]);

  const hasActiveFilters = hasListActiveFilters({ search });
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });

  const openEdit = React.useCallback((row: UnitType) => {
    setEditing(row);
    setUnitName(formatUnitTypeLabel(row));
    setUnitShortForm(row.short_form?.trim() ?? "");
    setIsActive(row.is_active);
    setErrors({});
    duplicate.clear();
    setFormOpen(true);
  }, []);

  function openCreate() {
    setEditing(null);
    setUnitName("");
    setUnitShortForm("");
    setIsActive(true);
    setErrors({});
    duplicate.clear();
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
    duplicate.clear();
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
    } catch (error) {
      if (!editing) duplicate.capture(error);
      reportLocalFormSubmitApiError(
        error,
        (fieldErrors) => setErrors((prev) => ({ ...prev, ...fieldErrors })),
        undefined,
        { fieldMap: { short_form: "shortForm" } },
      );
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
          <EntityDataTable columns={tableColumns} rows={items} onRowClick={(row) => setDetailRow(row)} />
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

      <DetailPanel
        open={detailRow !== null}
        onClose={() => setDetailRow(null)}
        title={
          detailRow ? (
            <SettingsDetailTitle
              name={formatUnitTypeLabel(detailRow)}
              idLabel={t("detail.idLabel", { id: detailRow.id })}
            />
          ) : null
        }
        footer={
          detailRow ? (
            <SettingsDetailActions
              cancelLabel={t("modal.cancel")}
              editLabel={t("edit")}
              deleteLabel={t("delete")}
              onCancel={() => setDetailRow(null)}
              onEdit={() => {
                const row = detailRow;
                setDetailRow(null);
                openEdit(row);
              }}
              onDelete={() => {
                const row = detailRow;
                setDetailRow(null);
                setDeleteTarget(row);
              }}
            />
          ) : undefined
        }
      >
        {detailRow ? (
          <SettingsDetailList>
            <SettingsDetailRow label={t("table.name")}>
              <SettingsDetailTextValue>{formatUnitTypeLabel(detailRow)}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.shortForm")}>
              <SettingsDetailTextValue>{formatUnitTypeShortLabel(detailRow)}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("detail.createdAt")}>
              <SettingsDetailTimestampValue
                dateFmt={dateFmt}
                value={detailRow.created_at}
                byUser={settingsDetailUserLabel(detailRow.created_by)}
                byUserTemplate={
                  settingsDetailUserLabel(detailRow.created_by) !== "—"
                    ? t("detail.byUser", { user: settingsDetailUserLabel(detailRow.created_by) })
                    : null
                }
              />
            </SettingsDetailRow>
            <SettingsDetailRow label={t("detail.updatedAt")}>
              <SettingsDetailTimestampValue
                dateFmt={dateFmt}
                value={detailRow.modified_at}
                byUser={settingsDetailUserLabel(detailRow.modified_by)}
                byUserTemplate={
                  settingsDetailUserLabel(detailRow.modified_by) !== "—"
                    ? t("detail.byUser", { user: settingsDetailUserLabel(detailRow.modified_by) })
                    : null
                }
              />
            </SettingsDetailRow>
          </SettingsDetailList>
        ) : null}
      </DetailPanel>

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
        <div className="flex flex-col gap-4">
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
                setUnitName(sanitizeTitleInput(e.target.value));
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={cn(
                surfaceInputClassName,
                errors.name && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              )}
              autoComplete="off"
            />
            {errors.name ? (
              <DuplicateEntryFieldError
                message={errors.name}
                fieldKey="name"
                conflict={duplicate.conflict}
                existingHref={duplicate.existingHref}
                linkOnDuplicate
              />
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
              <DuplicateEntryFieldError
                message={errors.shortForm}
                fieldKey="short_name"
                conflict={duplicate.conflict}
                existingHref={duplicate.existingHref}
                linkOnDuplicate
              />
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
