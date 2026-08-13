"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import {
  createRejectionReason,
  deleteRejectionReason,
  fetchRejectionReasonsPage,
  updateRejectionReason,
} from "@/features/rejection-reasons/api/rejection-reason.api";
import type { RejectionReason } from "@/features/rejection-reasons/types/rejection-reason.types";
import { formatRejectionReasonLabel } from "@/features/rejection-reasons/utils/rejection-reason-display.util";
import { reportLocalFormSubmitApiError, zTrimmedNonEmpty } from "@/shared/form";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import {
  SettingsDetailActions,
  SettingsDetailIdSubtitle,
  SettingsDetailList,
  SettingsDetailRow,
  SettingsDetailStatusValue,
  SettingsDetailTextValue,
  SettingsDetailTimestampValue,
  SettingsDetailTitle,
  settingsDetailUserLabel,
} from "@/shared/components/settings/settings-detail-view";
import { getApiErrorDisplayMessage, toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useListActiveInactiveEmptyState } from "@/shared/hooks/use-list-active-inactive-empty";
import {
  hasListActiveFilters,
  parseIsActiveParam,
  useListUrlState,
} from "@/shared/hooks/use-list-url-state";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
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
  DetailPanel,
  FieldGroup,
  ListPageActiveFilter,
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

function reasonUserLabel(user: RejectionReason["created_by"]): string {
  return settingsDetailUserLabel(user);
}

export function RejectionReasonSettingsPanel() {
  const t = useTranslations("Dashboard.rejectionReasons");
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

  const [items, setItems] = React.useState<RejectionReason[]>([]);
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
  const [detailRow, setDetailRow] = React.useState<RejectionReason | null>(null);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RejectionReason | null>(null);
  const [reasonName, setReasonName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{ name?: string }>({});

  const [deleteTarget, setDeleteTarget] = React.useState<RejectionReason | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchRejectionReasonsPage(page, pageSize, {
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
    const { pagination: p } = await fetchRejectionReasonsPage(1, 1, {
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

  function openCreate() {
    setDetailRow(null);
    setEditing(null);
    setReasonName("");
    setErrors({});
    setFormOpen(true);
  }

  const openEdit = React.useCallback((row: RejectionReason) => {
    setDetailRow(null);
    setEditing(row);
    setReasonName(formatRejectionReasonLabel(row));
    setErrors({});
    setFormOpen(true);
  }, []);

  async function handleToggleActive(row: RejectionReason, next: boolean) {
    setTogglingId(row.id);
    try {
      await updateRejectionReason(row.id, { is_active: next });
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
    });
    const parsed = formSchema.safeParse({ name: reasonName });
    if (!parsed.success) {
      const nextErrors: { name?: string } = {};
      for (const issue of parsed.error.issues) {
        if (String(issue.path[0] ?? "") === "name") nextErrors.name = String(issue.message);
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const { name } = parsed.data;
    setSaving(true);
    try {
      if (editing) {
        await updateRejectionReason(editing.id, { name });
        toastSuccess(t("saved"));
      } else {
        await createRejectionReason({ name });
        toastSuccess(t("created"));
      }
      setFormOpen(false);
      if (!editing) setUrl({ page: null });
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      reportLocalFormSubmitApiError(error, (fieldErrors) => setErrors((prev) => ({ ...prev, ...fieldErrors })));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRejectionReason(deleteTarget.id);
      toastSuccess(t("deleted"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

  const pageRange = getListPageRange(pagination);

  const tableColumns = React.useMemo(() => {
    const c = entityCol<RejectionReason>();
    return [
      c.primary("name", t("table.name"), (row) => formatRejectionReasonLabel(row)),
      c.status("recordStatus", t("table.status"), (r) => r.is_active, t("status.active"), t("status.inactive")),
      c.custom(
        "created",
        t("table.created"),
        (row) => (
          <>
            <span className="block text-slate-500 dark:text-slate-400">
              {formatFlexibleApiDate(row.created_at, dateFmt)}
            </span>
            {reasonUserLabel(row.created_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {reasonUserLabel(row.created_by)}
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
            {reasonUserLabel(row.modified_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {reasonUserLabel(row.modified_by)}
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
                  title={formatRejectionReasonLabel(row)}
                  meta={
                    <>
                      {t("table.updated")}: {formatFlexibleApiDate(row.modified_at, dateFmt)}
                      {reasonUserLabel(row.modified_by) !== "—"
                        ? ` · ${reasonUserLabel(row.modified_by)}`
                        : ""}
                    </>
                  }
                  description={`${t("table.created")}: ${formatFlexibleApiDate(row.created_at, dateFmt)}${
                    reasonUserLabel(row.created_by) !== "—"
                      ? ` · ${reasonUserLabel(row.created_by)}`
                      : ""
                  }`}
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
        title={detailRow ? <SettingsDetailTitle name={formatRejectionReasonLabel(detailRow)} /> : null}
        subtitle={
          detailRow ? <SettingsDetailIdSubtitle idLabel={t("detail.idLabel", { id: detailRow.id })} /> : undefined
        }
        footer={
          detailRow ? (
            <SettingsDetailActions
              cancelLabel={t("modal.cancel")}
              editLabel={t("edit")}
              deleteLabel={detailRow.is_system_generated ? undefined : t("delete")}
              onCancel={() => setDetailRow(null)}
              onEdit={() => {
                const row = detailRow;
                setDetailRow(null);
                openEdit(row);
              }}
              onDelete={
                detailRow.is_system_generated
                  ? undefined
                  : () => {
                      const row = detailRow;
                      setDetailRow(null);
                      setDeleteTarget(row);
                    }
              }
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
            <SettingsDetailRow label={t("table.name")}>
              <SettingsDetailTextValue>{formatRejectionReasonLabel(detailRow)}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.status")}>
              <SettingsDetailStatusValue
                active={detailRow.is_active}
                activeLabel={t("status.active")}
                inactiveLabel={t("status.inactive")}
              />
            </SettingsDetailRow>
            <SettingsDetailRow label={t("detail.createdAt")}>
              <SettingsDetailTimestampValue
                dateFmt={dateFmt}
                value={detailRow.created_at}
                byUser={reasonUserLabel(detailRow.created_by)}
                byUserTemplate={
                  reasonUserLabel(detailRow.created_by) !== "—"
                    ? t("detail.byUser", { user: reasonUserLabel(detailRow.created_by) })
                    : null
                }
              />
            </SettingsDetailRow>
            <SettingsDetailRow label={t("detail.updatedAt")}>
              <SettingsDetailTimestampValue
                dateFmt={dateFmt}
                value={detailRow.modified_at}
                byUser={reasonUserLabel(detailRow.modified_by)}
                byUserTemplate={
                  reasonUserLabel(detailRow.modified_by) !== "—"
                    ? t("detail.byUser", { user: reasonUserLabel(detailRow.modified_by) })
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
        titleId="rejection-reason-form-title"
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
        <FieldGroup
          label={
            <span>
              {t("modal.name")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="rejection-reason-name"
        >
          <input
            id="rejection-reason-name"
            value={reasonName}
            placeholder={t("modal.namePlaceholder")}
            onChange={(e) => {
              setReasonName(sanitizeTitleInput(e.target.value));
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
      </AppModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => (!deleting ? setDeleteTarget(null) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={deleteTarget ? formatRejectionReasonLabel(deleteTarget) : undefined}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
