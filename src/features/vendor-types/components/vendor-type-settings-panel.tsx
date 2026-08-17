"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import {
  createVendorType,
  deleteVendorType,
  fetchVendorTypesPage,
  updateVendorType,
} from "@/features/vendor-types/api/vendor-type.api";
import { VendorTypeChip } from "@/features/vendor-types/components/vendor-type-chip";
import type { VendorType } from "@/features/vendor-types/types/vendor-type.types";
import { formatVendorTypeLabel, normalizeVendorTypeHex } from "@/features/vendor-types/utils/vendor-type-display.util";
import { reportLocalFormSubmitApiError, zHexColour6, zTrimmedNonEmpty } from "@/shared/form";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import {
  SettingsDetailActions,
  SettingsDetailColourValue,
  SettingsDetailList,
  SettingsDetailRow,
  SettingsDetailStatusValue,
  SettingsDetailTextValue,
  SettingsDetailTimestampValue,
  SettingsDetailTitle,
  settingsDetailUserLabel,
} from "@/shared/components/settings/settings-detail-view";
import { toastError, toastSuccess, toastApiError, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useListActiveInactiveEmptyState } from "@/shared/hooks/use-list-active-inactive-empty";
import { hasListActiveFilters, parseIsActiveParam, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
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
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  listPageRootClassName,
  DetailPanel,
  FieldGroup,
  ListPageActiveFilter,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
  fieldLabelClassName,
  surfaceInputClassName,
} from "@/shared/ui";

const DEFAULT_BG = "#DBEAFE";
const DEFAULT_TEXT = "#1E40AF";

function bgHex(row: VendorType): string {
  return normalizeVendorTypeHex(row.bg_color, DEFAULT_BG);
}

function textHex(row: VendorType): string {
  return normalizeVendorTypeHex(row.text_color, DEFAULT_TEXT);
}

function vendorTypeUserLabel(user: VendorType["created_by"]): string {
  if (!user) return "—";
  const name = user.username?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email;
  return `#${user.id}`;
}

export function VendorTypeSettingsPanel() {
  const t = useTranslations("Dashboard.vendorTypes");
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

  const [items, setItems] = React.useState<VendorType[]>([]);
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
  const [detailRow, setDetailRow] = React.useState<VendorType | null>(null);
  const [togglingId, setTogglingId] = React.useState<number | null>(null);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<VendorType | null>(null);
  const [typeName, setTypeName] = React.useState("");
  const [bgColour, setBgColour] = React.useState(DEFAULT_BG);
  const [textColour, setTextColour] = React.useState(DEFAULT_TEXT);
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{ name?: string; bg_color?: string; text_color?: string }>({});

  const [deleteTarget, setDeleteTarget] = React.useState<VendorType | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchVendorTypesPage(page, pageSize, {
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
    const { pagination: p } = await fetchVendorTypesPage(1, 1, {
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

  const openEdit = React.useCallback((row: VendorType) => {
    setDetailRow(null);
    setEditing(row);
    setTypeName(formatVendorTypeLabel(row));
    setBgColour(bgHex(row));
    setTextColour(textHex(row));
    setIsActive(row.is_active);
    setErrors({});
    setFormOpen(true);
  }, []);

  function openCreate() {
    setDetailRow(null);
    setEditing(null);
    setTypeName("");
    setBgColour(DEFAULT_BG);
    setTextColour(DEFAULT_TEXT);
    setIsActive(true);
    setErrors({});
    setFormOpen(true);
  }

  async function handleToggleActive(row: VendorType, next: boolean) {
    setTogglingId(row.id);
    try {
      await updateVendorType(row.id, { is_active: next });
      toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
      setDetailRow((prev) => (prev?.id === row.id ? { ...prev, is_active: next } : prev));
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      toastApiError(error, t("toggleActiveError"));
    } finally {
      setTogglingId(null);
    }
  }

  async function submitForm() {
    const formSchema = z.object({
      name: zTrimmedNonEmpty(t("validationName")),
      bg_color: zHexColour6(t("validationHex")),
      text_color: zHexColour6(t("validationHex")),
    });
    const parsed = formSchema.safeParse({ name: typeName, bg_color: bgColour, text_color: textColour });
    if (!parsed.success) {
      const nextErrors: { name?: string; bg_color?: string; text_color?: string } = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field === "name") nextErrors.name = String(issue.message);
        if (field === "bg_color") nextErrors.bg_color = String(issue.message);
        if (field === "text_color") nextErrors.text_color = String(issue.message);
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const { name, bg_color: bg, text_color: fg } = parsed.data;
    setSaving(true);
    try {
      if (editing) {
        await updateVendorType(editing.id, { name, bg_color: bg, text_color: fg, is_active: isActive });
        toastSuccess(t("saved"));
      } else {
        await createVendorType({ name, bg_color: bg, text_color: fg });
        toastSuccess(t("created"));
      }
      setFormOpen(false);
      if (!editing) setUrl({ page: null });
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      reportLocalFormSubmitApiError(error, (fieldErrors) => {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVendorType(deleteTarget.id);
      toastSuccess(t("deleted"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

  const pageRange = getListPageRange(pagination);

  const tableColumns = React.useMemo(() => {
    const c = entityCol<VendorType>();
    return [
      c.custom("type", t("table.type"), (row) => <VendorTypeChip row={row} />),
      c.status("recordStatus", t("table.status"), (r) => r.is_active, t("status.active"), t("status.inactive")),
      c.custom(
        "created",
        t("table.created"),
        (row) => (
          <>
            <span className="block text-slate-500 dark:text-slate-400">{dateFmt.format(new Date(row.created_at))}</span>
            {vendorTypeUserLabel(row.created_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {vendorTypeUserLabel(row.created_by)}
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
            <span className="block text-slate-500 dark:text-slate-400">{dateFmt.format(new Date(row.modified_at))}</span>
            {vendorTypeUserLabel(row.modified_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {vendorTypeUserLabel(row.modified_by)}
              </span>
            ) : null}
          </>
        ),
        { responsive: "md" },
      ),
    ];
  }, [t, dateFmt]);

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
                  title={<VendorTypeChip row={row} className="text-sm font-semibold" />}
                  meta={
                    <>
                      {t("detail.updatedAt")}: {dateFmt.format(new Date(row.modified_at))}
                      {vendorTypeUserLabel(row.modified_by) !== "—"
                        ? ` · ${vendorTypeUserLabel(row.modified_by)}`
                        : ""}
                    </>
                  }
                  description={`${t("detail.createdAt")}: ${dateFmt.format(new Date(row.created_at))}${
                    vendorTypeUserLabel(row.created_by) !== "—"
                      ? ` · ${t("detail.byUser", { user: vendorTypeUserLabel(row.created_by) })}`
                      : ""
                  } · ${bgHex(row).toUpperCase()} / ${textHex(row).toUpperCase()}`}
                  footer={
                    <ActiveStatusBadge
                      active={row.is_active}
                      label={row.is_active ? t("status.active") : t("status.inactive")}
                    />
                  }
                  onCardClick={() => setDetailRow(row)}
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
              name={formatVendorTypeLabel(detailRow)}
              bgColour={bgHex(detailRow)}
              textColour={textHex(detailRow)}
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
              toggleLabel={detailRow.is_active ? t("deactivate") : t("activate")}
              toggleLoading={togglingId === detailRow.id}
              toggleDisabled={togglingId === detailRow.id}
              onToggle={() => void handleToggleActive(detailRow, !detailRow.is_active)}
            />
          ) : undefined
        }
      >
        {detailRow ? (
          <SettingsDetailList>
            <SettingsDetailRow label={t("table.type")}>
              <SettingsDetailTextValue>{formatVendorTypeLabel(detailRow)}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.status")}>
              <SettingsDetailStatusValue
                active={detailRow.is_active}
                activeLabel={t("status.active")}
                inactiveLabel={t("status.inactive")}
              />
            </SettingsDetailRow>
            <SettingsDetailRow label={t("modal.bgColour")}>
              <SettingsDetailColourValue hex={bgHex(detailRow)} />
            </SettingsDetailRow>
            <SettingsDetailRow label={t("modal.textColour")}>
              <SettingsDetailColourValue
                hex={textHex(detailRow)}
                previewBg={bgHex(detailRow)}
                previewText={textHex(detailRow)}
                sample
              />
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
        titleId="vendor-type-form-title"
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
                {t("modal.typeName")} <span className="text-red-500">*</span>
              </span>
            }
            htmlFor="vendor-type-name"
          >
            <input
              id="vendor-type-name"
              value={typeName}
              onChange={(e) => {
                setTypeName(sanitizeTitleInput(e.target.value));
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={cn(
                surfaceInputClassName,
                errors.name && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              )}
              autoComplete="off"
            />
            {errors.name ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p> : null}
          </FieldGroup>
          <div>
            <span className={fieldLabelClassName}>
              {t("modal.bgColour")} <span className="text-red-500">*</span>
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={normalizeVendorTypeHex(bgColour, DEFAULT_BG).slice(0, 7)}
                onChange={(e) => setBgColour(e.target.value)}
                className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600"
                aria-label={t("modal.bgColour")}
              />
              <input
                value={bgColour}
                onChange={(e) => {
                  setBgColour(e.target.value);
                  if (errors.bg_color) setErrors((prev) => ({ ...prev, bg_color: undefined }));
                }}
                className={cn(
                  surfaceInputClassName,
                  "px-3 font-mono",
                  errors.bg_color && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                )}
                placeholder={t("hexPlaceholder")}
                spellCheck={false}
              />
            </div>
            {errors.bg_color ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.bg_color}</p> : null}
          </div>
          <div>
            <span className={fieldLabelClassName}>
              {t("modal.textColour")} <span className="text-red-500">*</span>
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={normalizeVendorTypeHex(textColour, DEFAULT_TEXT).slice(0, 7)}
                onChange={(e) => setTextColour(e.target.value)}
                className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600"
                aria-label={t("modal.textColour")}
              />
              <input
                value={textColour}
                onChange={(e) => {
                  setTextColour(e.target.value);
                  if (errors.text_color) setErrors((prev) => ({ ...prev, text_color: undefined }));
                }}
                className={cn(
                  surfaceInputClassName,
                  "px-3 font-mono",
                  errors.text_color && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                )}
                placeholder={t("hexPlaceholder")}
                spellCheck={false}
              />
            </div>
            {errors.text_color ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.text_color}</p>
            ) : null}
          </div>
          {editing ? (
            <FieldGroup label={t("modal.activeLabel")} htmlFor="vendor-type-active">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  id="vendor-type-active"
                  type="checkbox"
                  className="size-4 rounded border-slate-300"
                  checked={isActive}
                  disabled={saving}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                {isActive ? t("status.active") : t("status.inactive")}
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
        highlight={deleteTarget ? formatVendorTypeLabel(deleteTarget) : undefined}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
