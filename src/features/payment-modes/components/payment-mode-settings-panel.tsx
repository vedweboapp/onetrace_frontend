"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import {
  createPaymentMode,
  deletePaymentMode,
  fetchPaymentModesPage,
  updatePaymentMode,
} from "@/features/payment-modes/api/payment-mode.api";
import type { PaymentMode } from "@/features/payment-modes/types/payment-mode.types";
import {
  formatPaymentModeLabel,
  toPaymentModeSystemName,
} from "@/features/payment-modes/utils/payment-mode-display.util";
import { reportLocalFormSubmitApiError, zTrimmedNonEmpty } from "@/shared/form";
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
import { getApiErrorDisplayMessage, toastSuccess } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { routes } from "@/shared/config/routes";
import {
  AddButton,
  AppButton,
  AppModal,
  ConfirmDialog,
  DataTablePaginationBar,
  DetailPanel,
  FieldGroup,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageEmptyStates,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
  listPageRootClassName,
  listPageSurfaceShellClassName,
  surfaceInputClassName,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

function paymentModeUserLabel(user: PaymentMode["created_by"]): string {
  if (!user) return "—";
  const name = user.username?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email;
  return `#${user.id}`;
}

function yesNo(value: boolean, yes: string, no: string) {
  return value ? yes : no;
}

export function PaymentModeSettingsPanel() {
  const t = useTranslations("Dashboard.paymentModes");
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

  const [items, setItems] = React.useState<PaymentMode[]>([]);
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
  const [detailRow, setDetailRow] = React.useState<PaymentMode | null>(null);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PaymentMode | null>(null);
  const [name, setName] = React.useState("");
  const [systemName, setSystemName] = React.useState("");
  const [systemNameTouched, setSystemNameTouched] = React.useState(false);
  const [isDefault, setIsDefault] = React.useState(false);
  const [isMandatory, setIsMandatory] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{ name?: string; system_name?: string }>({});

  const [deleteTarget, setDeleteTarget] = React.useState<PaymentMode | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchPaymentModesPage(page, pageSize, {
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
  const pageRange = getListPageRange(pagination);

  const openEdit = React.useCallback((row: PaymentMode) => {
    setDetailRow(null);
    setEditing(row);
    setName(formatPaymentModeLabel(row));
    setSystemName(row.system_name ?? "");
    setSystemNameTouched(true);
    setIsDefault(Boolean(row.is_default));
    setIsMandatory(Boolean(row.is_mandatory));
    setErrors({});
    setFormOpen(true);
  }, []);

  function openCreate() {
    setDetailRow(null);
    setEditing(null);
    setName("");
    setSystemName("");
    setSystemNameTouched(false);
    setIsDefault(false);
    setIsMandatory(false);
    setErrors({});
    setFormOpen(true);
  }

  function onNameChange(next: string) {
    const cleaned = sanitizeTitleInput(next);
    setName(cleaned);
    if (!editing && !systemNameTouched) {
      setSystemName(toPaymentModeSystemName(cleaned));
    }
  }

  async function submitForm() {
    const formSchema = z.object({
      name: zTrimmedNonEmpty(t("validationName")),
      system_name: zTrimmedNonEmpty(t("validationSystemName")),
    });
    const resolvedSystemName =
      systemName.trim() || toPaymentModeSystemName(name);
    const parsed = formSchema.safeParse({ name, system_name: resolvedSystemName });
    if (!parsed.success) {
      const nextErrors: { name?: string; system_name?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key === "name" || key === "system_name") {
          nextErrors[key] = String(issue.message);
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const payload = {
      name: parsed.data.name,
      system_name: parsed.data.system_name,
      is_default: isDefault,
      is_mandatory: isMandatory,
    };
    setSaving(true);
    try {
      if (editing) {
        await updatePaymentMode(editing.id, payload);
        toastSuccess(t("saved"));
      } else {
        await createPaymentMode(payload);
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
      await deletePaymentMode(deleteTarget.id);
      toastSuccess(t("deleted"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

  const tableColumns = React.useMemo(() => {
    const c = entityCol<PaymentMode>();
    return [
      c.primary("name", t("table.name"), (row) => formatPaymentModeLabel(row)),
      c.text("system_name", t("table.systemName"), (row) => row.system_name || "—"),
      c.custom("default", t("table.default"), (row) => (
        <span className="text-slate-600 dark:text-slate-300">
          {yesNo(row.is_default, t("yes"), t("no"))}
        </span>
      )),
      c.custom("mandatory", t("table.mandatory"), (row) => (
        <span className="text-slate-600 dark:text-slate-300">
          {yesNo(row.is_mandatory, t("yes"), t("no"))}
        </span>
      )),
      c.custom(
        "created",
        t("table.created"),
        (row) => (
          <>
            <span className="block text-slate-500 dark:text-slate-400">
              {formatFlexibleApiDate(row.created_at, dateFmt)}
            </span>
            {paymentModeUserLabel(row.created_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {paymentModeUserLabel(row.created_by)}
              </span>
            ) : null}
          </>
        ),
      ),
    ];
  }, [t, dateFmt]);

  const canDeleteDetail = detailRow && !detailRow.is_system_generated;

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
            <ListPageSearchField
              value={search}
              onCommit={commitSearch}
              className="sm:max-w-sm"
            />
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
              iconName: "customization",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
              action: <AddButton type="button" onClick={openCreate} />,
            }}
            onClearFilters={() => setUrl({ search: null, page: null }, { replace: true })}
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  title={formatPaymentModeLabel(row)}
                  meta={
                    <>
                      {row.system_name}
                      {row.is_default ? ` · ${t("table.default")}` : ""}
                      {row.is_mandatory ? ` · ${t("table.mandatory")}` : ""}
                    </>
                  }
                  description={`${t("detail.createdAt")}: ${formatFlexibleApiDate(row.created_at, dateFmt)}`}
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
            summary={t("pageLabel", {
              start: pageRange.start,
              end: pageRange.end,
              total: pagination.total_records,
            })}
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
              name={formatPaymentModeLabel(detailRow)}
              idLabel={t("detail.idLabel", { id: detailRow.id })}
            />
          ) : null
        }
        footer={
          detailRow ? (
            <SettingsDetailActions
              cancelLabel={t("modal.cancel")}
              editLabel={t("edit")}
              deleteLabel={canDeleteDetail ? t("delete") : undefined}
              onCancel={() => setDetailRow(null)}
              onEdit={() => {
                const row = detailRow;
                setDetailRow(null);
                openEdit(row);
              }}
              onDelete={
                canDeleteDetail
                  ? () => {
                      const row = detailRow;
                      setDetailRow(null);
                      setDeleteTarget(row);
                    }
                  : undefined
              }
            />
          ) : undefined
        }
      >
        {detailRow ? (
          <SettingsDetailList>
            <SettingsDetailRow label={t("table.name")}>
              <SettingsDetailTextValue>{formatPaymentModeLabel(detailRow)}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.systemName")}>
              <SettingsDetailTextValue>{detailRow.system_name || "—"}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.default")}>
              <SettingsDetailTextValue>
                {yesNo(detailRow.is_default, t("yes"), t("no"))}
              </SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.mandatory")}>
              <SettingsDetailTextValue>
                {yesNo(detailRow.is_mandatory, t("yes"), t("no"))}
              </SettingsDetailTextValue>
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
        titleId="payment-mode-form-title"
        closeOnBackdrop={!saving}
        isBusy={saving}
        footer={
          <>
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => setFormOpen(false)}
            >
              {t("modal.cancel")}
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              loading={saving}
              onClick={() => void submitForm()}
            >
              {t("modal.save")}
            </AppButton>
          </>
        }
      >
        <div className="space-y-4">
          <FieldGroup label={t("modal.name")} htmlFor="payment-mode-name" required>
            <input
              id="payment-mode-name"
              className={cn(surfaceInputClassName, errors.name && "border-red-400")}
              value={name}
              onChange={(e) => {
                onNameChange(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder={t("modal.namePlaceholder")}
              disabled={saving}
            />
            {errors.name ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>
            ) : null}
          </FieldGroup>
          <FieldGroup label={t("modal.systemName")} htmlFor="payment-mode-system-name" required>
            <input
              id="payment-mode-system-name"
              className={cn(surfaceInputClassName, errors.system_name && "border-red-400")}
              value={systemName}
              onChange={(e) => {
                setSystemNameTouched(true);
                setSystemName(sanitizeTitleInput(e.target.value).toLowerCase().replace(/\s+/g, "_"));
                if (errors.system_name) setErrors((prev) => ({ ...prev, system_name: undefined }));
              }}
              placeholder={t("modal.systemNamePlaceholder")}
              disabled={saving || Boolean(editing?.is_system_generated)}
            />
            {errors.system_name ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.system_name}</p>
            ) : null}
          </FieldGroup>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              disabled={saving}
              className="h-4 w-4 rounded border-slate-300"
            />
            {t("modal.isDefault")}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={isMandatory}
              onChange={(e) => setIsMandatory(e.target.checked)}
              disabled={saving}
              className="h-4 w-4 rounded border-slate-300"
            />
            {t("modal.isMandatory")}
          </label>
        </div>
      </AppModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => (!deleting ? setDeleteTarget(null) : undefined)}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        confirmVariant="danger"
        isBusy={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
