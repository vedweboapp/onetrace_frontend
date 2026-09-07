"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import { createTitle, deleteTitle, fetchTitlesPage, updateTitle } from "@/features/titles/api/title.api";
import type { Title } from "@/features/titles/types/title.types";
import { formatTitleLabel } from "@/features/titles/utils/title-display.util";
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

function titleUserLabel(user: Title["created_by"]): string {
  if (!user) return "—";
  const name = user.username?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email;
  return `#${user.id}`;
}

export function TitleSettingsPanel() {
  const t = useTranslations("Dashboard.titleSettings");
  const tList = useTranslations("Dashboard.list");
  const tCustomization = useTranslations("Dashboard.settingsNav.customization");
  const dateFmt = useDashboardDateFormat();
  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } = useListUrlState();

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  const [items, setItems] = React.useState<Title[]>([]);
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
  const [detailRow, setDetailRow] = React.useState<Title | null>(null);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Title | null>(null);
  const [titleName, setTitleName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{ title?: string }>({});

  const [deleteTarget, setDeleteTarget] = React.useState<Title | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchTitlesPage(page, pageSize, {
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

  const openEdit = React.useCallback((row: Title) => {
    setDetailRow(null);
    setEditing(row);
    setTitleName(formatTitleLabel(row));
    setErrors({});
    setFormOpen(true);
  }, []);

  function openCreate() {
    setDetailRow(null);
    setEditing(null);
    setTitleName("");
    setErrors({});
    setFormOpen(true);
  }

  async function submitForm() {
    const formSchema = z.object({
      title: zTrimmedNonEmpty(t("validationName")),
    });
    const parsed = formSchema.safeParse({ title: titleName });
    if (!parsed.success) {
      const nextErrors: { title?: string } = {};
      for (const issue of parsed.error.issues) {
        if (String(issue.path[0] ?? "") === "title") {
          nextErrors.title = String(issue.message);
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const { title } = parsed.data;
    setSaving(true);
    try {
      if (editing) {
        await updateTitle(editing.id, { title });
        toastSuccess(t("saved"));
      } else {
        await createTitle({ title });
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
      await deleteTitle(deleteTarget.id);
      toastSuccess(t("deleted"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

  const tableColumns = React.useMemo(() => {
    const c = entityCol<Title>();
    return [
      c.primary("title", t("table.title"), (row) => formatTitleLabel(row)),
      c.custom(
        "created",
        t("table.created"),
        (row) => (
          <>
            <span className="block text-slate-500 dark:text-slate-400">
              {formatFlexibleApiDate(row.created_at, dateFmt)}
            </span>
            {titleUserLabel(row.created_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {titleUserLabel(row.created_by)}
              </span>
            ) : null}
          </>
        ),
      ),
      c.custom(
        "updated",
        t("table.updated"),
        (row) => (
          <>
            <span className="block text-slate-500 dark:text-slate-400">
              {formatFlexibleApiDate(row.modified_at, dateFmt)}
            </span>
            {titleUserLabel(row.modified_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {titleUserLabel(row.modified_by)}
              </span>
            ) : null}
          </>
        ),
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
            <ListPageSearchField
              value={search}
              onCommit={commitSearch}
              placeholder={tList("searchPlaceholder")}
              ariaLabel={tList("searchAria")}
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
              iconName: "projects",
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
                  title={formatTitleLabel(row)}
                  meta={
                    <>
                      {t("detail.updatedAt")}: {dateFmt.format(new Date(row.modified_at))}
                      {titleUserLabel(row.modified_by) !== "—" ? ` · ${titleUserLabel(row.modified_by)}` : ""}
                    </>
                  }
                  description={`${t("detail.createdAt")}: ${dateFmt.format(new Date(row.created_at))}${
                    titleUserLabel(row.created_by) !== "—"
                      ? ` · ${t("detail.byUser", { user: titleUserLabel(row.created_by) })}`
                      : ""
                  }`}
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
              name={formatTitleLabel(detailRow)}
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
            <SettingsDetailRow label={t("table.title")}>
              <SettingsDetailTextValue>{formatTitleLabel(detailRow)}</SettingsDetailTextValue>
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
        titleId="title-form-title"
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
              {t("modal.titleName")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="title-name"
        >
          <input
            id="title-name"
            value={titleName}
            placeholder={t("modal.titleNamePlaceholder")}
            onChange={(e) => {
              setTitleName(sanitizeTitleInput(e.target.value));
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            className={cn(
              surfaceInputClassName,
              errors.title && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            )}
            autoComplete="off"
          />
          {errors.title ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.title}</p>
          ) : null}
        </FieldGroup>
      </AppModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => (!deleting ? setDeleteTarget(null) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={deleteTarget ? formatTitleLabel(deleteTarget) : undefined}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
