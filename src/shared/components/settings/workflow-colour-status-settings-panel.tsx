
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import type { createWorkflowColourStatusApi } from "@/shared/api/create-workflow-colour-status.api";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { cn } from "@/core/utils/http.util";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import {
  AddButton, AppButton,
  AppModal,
  ConfirmDialog,
  ActiveStatusBadge,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  type DashboardEmptyStateIconName,
  DataTablePaginationBar,
  DetailPanel,
  FieldGroup,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
  fieldLabelClassName,
  surfaceInputClassName,
} from "@/shared/ui";
import { zHexColour6, zTrimmedNonEmpty } from "@/shared/form";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";

const DEFAULT_BG = "#E5E7EB";
const DEFAULT_TEXT = "#374151";

function normalizeHex(raw: string): string {
  const t = raw.trim();
  if (!t) return DEFAULT_BG;
  const h = t.startsWith("#") ? t : `#${t}`;
  if (h.length === 4) {
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
  }
  return h.slice(0, 7).toLowerCase();
}

function statusUserLabel(user: WorkflowColourStatus["created_by"]): string {
  if (!user) return "—";
  const name = user.username?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email;
  return `#${user.id}`;
}

function StatusChip({
  row,
  className,
}: {
  row: Pick<WorkflowColourStatus, "status_name" | "bg_colour" | "text_colour">;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full border border-black/10 px-3 py-1 text-xs font-semibold shadow-sm",
        className,
      )}
      style={{
        backgroundColor: normalizeHex(row.bg_colour),
        color: normalizeHex(row.text_colour),
      }}
    >
      {row.status_name}
    </span>
  );
}

export type WorkflowColourStatusMessagesNamespace =
  | "Dashboard.pinStatus"
  | "Dashboard.jobStatus"
  | "Dashboard.materialStatus";

export type WorkflowColourStatusSettingsConfig = {
  translationNamespace: WorkflowColourStatusMessagesNamespace;
  emptyStateIconName: DashboardEmptyStateIconName;
  formTitleId: string;
  api: ReturnType<typeof createWorkflowColourStatusApi>;
};

export function WorkflowColourStatusSettingsPanel({ config }: { config: WorkflowColourStatusSettingsConfig }) {
  const { translationNamespace, emptyStateIconName, formTitleId, api } = config;
  const t = useTranslations(translationNamespace);
  const tList = useTranslations("Dashboard.list");
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
  const [items, setItems] = React.useState<WorkflowColourStatus[]>([]);
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

  const [detailRow, setDetailRow] = React.useState<WorkflowColourStatus | null>(null);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<WorkflowColourStatus | null>(null);
  const [statusName, setStatusName] = React.useState("");
  const [bgColour, setBgColour] = React.useState(DEFAULT_BG);
  const [textColour, setTextColour] = React.useState(DEFAULT_TEXT);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    status_name?: string;
    bg_colour?: string;
    text_colour?: string;
  }>({});

  const [deleteTarget, setDeleteTarget] = React.useState<WorkflowColourStatus | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<number | null>(null);

  const openEdit = React.useCallback((row: WorkflowColourStatus) => {
    setDetailRow(null);
    setEditing(row);
    setStatusName(row.status_name);
    setBgColour(normalizeHex(row.bg_colour));
    setTextColour(normalizeHex(row.text_colour));
    setErrors({});
    setFormOpen(true);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await api.fetchPage(page, pageSize, {
          search: search || undefined,
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
  }, [api, page, pageSize, search, refreshNonce, t]);

  function openCreate() {
    setDetailRow(null);
    setEditing(null);
    setStatusName("");
    setBgColour(DEFAULT_BG);
    setTextColour(DEFAULT_TEXT);
    setErrors({});
    setFormOpen(true);
  }

  async function submitForm() {
    const hexMsg = t("validationHex");

    const formSchema = z.object({
      status_name: zTrimmedNonEmpty(t("validationName")),
      bg_colour: zHexColour6(hexMsg),
      text_colour: zHexColour6(hexMsg),
    });

    const parsed = formSchema.safeParse({
      status_name: statusName,
      bg_colour: bgColour,
      text_colour: textColour,
    });

    if (!parsed.success) {
      const nextErrors: { status_name?: string; bg_colour?: string; text_colour?: string } = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field === "status_name") nextErrors.status_name = String(issue.message);
        if (field === "bg_colour") nextErrors.bg_colour = String(issue.message);
        if (field === "text_colour") nextErrors.text_colour = String(issue.message);
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const { status_name: name, bg_colour: bg, text_colour: fg } = parsed.data;

    setSaving(true);
    try {
      if (editing) {
        await api.update(editing.id, {
          status_name: name,
          bg_colour: bg,
          text_colour: fg,
        });
        toastSuccess(t("saved"));
      } else {
        await api.create({ status_name: name, bg_colour: bg, text_colour: fg });
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
      await api.remove(deleteTarget.id);
      toastSuccess(t("deleted"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(row: WorkflowColourStatus, next: boolean) {
    setTogglingId(row.id);
    try {
      await api.update(row.id, { is_active: next });
      toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
      setDetailRow((prev) => (prev?.id === row.id ? { ...prev, is_active: next } : prev));
      setRefreshNonce((n) => n + 1);
    } catch {
      toastError(t("toggleActiveError"));
    } finally {
      setTogglingId(null);
    }
  }

  const hasActiveFilters = hasListActiveFilters({ search });
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });
  const pageRange = getListPageRange(pagination);

  const tableColumns = React.useMemo(() => {
    const c = entityCol<WorkflowColourStatus>();
    return [
      c.custom("status", t("table.status"), (row) => <StatusChip row={row} />),
      c.truncate("createdBy", t("table.createdBy"), (row) => statusUserLabel(row.created_by), {
        title: (row) => statusUserLabel(row.created_by),
      }),
      c.date("createdAt", t("table.createdAt"), (row) => row.created_at, dateFmt),
    ];
  }, [t, dateFmt]);

  return (
    <div className="space-y-6">
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={filtersActive}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          action={
            <AddButton type="button" onClick={openCreate} />
          }
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
              iconName: emptyStateIconName,
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
                  title={<StatusChip row={row} className="text-sm font-semibold" />}
                  meta={
                    <>
                      {statusUserLabel(row.created_by)} · {dateFmt.format(new Date(row.created_at))}
                    </>
                  }
                  onCardClick={() => setDetailRow(row)}
                />
              ))}
            </ListPageCardGrid>
          </div>
        ) : (
          <EntityDataTable columns={tableColumns} rows={items} onRowClick={(row) => setDetailRow(row)} />
        )}

        {!loading && !loadError && items.length > 0 ? (
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
              disabled: loading,
            }}
          />
        ) : null}
      </SurfaceShell>

      <DetailPanel
        open={detailRow !== null}
        onClose={() => setDetailRow(null)}
        title={detailRow ? <StatusChip row={detailRow} className="text-base font-semibold" /> : null}
        subtitle={
          detailRow ? (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t("detail.idLabel", { id: detailRow.id })}
            </span>
          ) : undefined
        }
        footer={
          detailRow ? (
            <>
              <AppButton type="button" variant="secondary" size="sm" onClick={() => setDetailRow(null)}>
                {t("modal.cancel")}
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const row = detailRow;
                  setDetailRow(null);
                  openEdit(row);
                }}
              >
                {t("edit")}
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                loading={togglingId === detailRow.id}
                disabled={togglingId === detailRow.id}
                onClick={() => void handleToggleActive(detailRow, detailRow.is_active !== true)}
              >
                {detailRow.is_active === true ? t("deactivate") : t("activate")}
              </AppButton>
              <AppButton
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  const row = detailRow;
                  setDetailRow(null);
                  setDeleteTarget(row);
                }}
              >
                {t("delete")}
              </AppButton>
            </>
          ) : undefined
        }
      >
        {detailRow ? (
          <div className="space-y-5">
            <FieldGroup label={t("table.status")}>
              <ActiveStatusBadge
                active={detailRow.is_active === true}
                label={detailRow.is_active === true ? t("status.active") : t("status.inactive")}
              />
            </FieldGroup>
            <FieldGroup label={t("modal.bgColour")}>
              <div className="flex items-center gap-3">
                <span
                  className="size-8 shrink-0 rounded-none border border-slate-200 dark:border-slate-600"
                  style={{ backgroundColor: normalizeHex(detailRow.bg_colour) }}
                  aria-hidden
                />
                <p className="font-mono text-sm text-slate-700 dark:text-slate-200">
                  {normalizeHex(detailRow.bg_colour).toUpperCase()}
                </p>
              </div>
            </FieldGroup>
            <FieldGroup label={t("modal.textColour")}>
              <div className="flex items-center gap-3">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-none border border-slate-200 text-xs font-bold dark:border-slate-600"
                  style={{
                    backgroundColor: normalizeHex(detailRow.bg_colour),
                    color: normalizeHex(detailRow.text_colour),
                  }}
                  aria-hidden
                >
                  Aa
                </span>
                <p className="font-mono text-sm text-slate-700 dark:text-slate-200">
                  {normalizeHex(detailRow.text_colour).toUpperCase()}
                </p>
              </div>
            </FieldGroup>
            <FieldGroup label={t("detail.createdAt")}>
              <p className="text-sm text-slate-800 dark:text-slate-200">
                {dateFmt.format(new Date(detailRow.created_at))}
              </p>
              {statusUserLabel(detailRow.created_by) !== "—" ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("detail.byUser", { user: statusUserLabel(detailRow.created_by) })}
                </p>
              ) : null}
            </FieldGroup>
            <FieldGroup label={t("detail.updatedAt")}>
              <p className="text-sm text-slate-800 dark:text-slate-200">
                {dateFmt.format(new Date(detailRow.modified_at))}
              </p>
              {statusUserLabel(detailRow.modified_by) !== "—" ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("detail.byUser", { user: statusUserLabel(detailRow.modified_by) })}
                </p>
              ) : null}
            </FieldGroup>
          </div>
        ) : null}
      </DetailPanel>

      <AppModal
        open={formOpen}
        onClose={() => (!saving ? setFormOpen(false) : undefined)}
        title={editing ? t("modal.editTitle") : t("modal.createTitle")}
        titleId={formTitleId}
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
                {t("modal.statusName")} <span className="text-red-500">*</span>
              </span>
            }
            htmlFor={`${formTitleId}-name`}
          >
            <input
              id={`${formTitleId}-name`}
              value={statusName}
              onChange={(e) => {
                setStatusName(capitalizeFirstLetter(e.target.value));
                if (errors.status_name) setErrors((prev) => ({ ...prev, status_name: undefined }));
              }}
              className={cn(surfaceInputClassName, errors.status_name && "border-red-500 focus:border-red-500 focus:ring-red-500/20")}
              autoComplete="off"
            />
            {errors.status_name ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.status_name}</p> : null}
          </FieldGroup>
          <div>
            <span className={fieldLabelClassName}>{t("modal.bgColour")} <span className="text-red-500">*</span></span>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={normalizeHex(bgColour).slice(0, 7)}
                onChange={(e) => setBgColour(e.target.value)}
                className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600"
                aria-label={t("modal.bgColour")}
              />
              <input
                value={bgColour}
                onChange={(e) => {
                  setBgColour(e.target.value);
                  if (errors.bg_colour) setErrors((prev) => ({ ...prev, bg_colour: undefined }));
                }}
                className={cn(surfaceInputClassName, "px-3 font-mono", errors.bg_colour && "border-red-500 focus:border-red-500 focus:ring-red-500/20")}
                placeholder={t("hexPlaceholder")}
                spellCheck={false}
              />
            </div>
            {errors.bg_colour ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.bg_colour}</p> : null}
          </div>
          <div>
            <span className={fieldLabelClassName}>{t("modal.textColour")} <span className="text-red-500">*</span></span>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={normalizeHex(textColour).slice(0, 7)}
                onChange={(e) => setTextColour(e.target.value)}
                className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600"
                aria-label={t("modal.textColour")}
              />
              <input
                value={textColour}
                onChange={(e) => {
                  setTextColour(e.target.value);
                  if (errors.text_colour) setErrors((prev) => ({ ...prev, text_colour: undefined }));
                }}
                className={cn(surfaceInputClassName, "px-3 font-mono", errors.text_colour && "border-red-500 focus:border-red-500 focus:ring-red-500/20")}
                placeholder={t("hexPlaceholder")}
                spellCheck={false}
              />
            </div>
            {errors.text_colour ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.text_colour}</p> : null}
          </div>
        </div>
      </AppModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => (!deleting ? setDeleteTarget(null) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={deleteTarget?.status_name}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
