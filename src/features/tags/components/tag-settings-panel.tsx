"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import { createTag, deleteTag, fetchTagsPage, updateTag } from "@/features/tags/api/tag.api";
import type { Tag } from "@/features/tags/types/tag.types";
import { reportLocalFormSubmitApiError, zHexColour6, zTrimmedNonEmpty } from "@/shared/form";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import {
  SettingsDetailActions,
  SettingsDetailColourValue,
  SettingsDetailIdSubtitle,
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
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { routes } from "@/shared/config/routes";
import {
  AddButton, AppButton,
  AppModal,
  ConfirmDialog,
  DataTablePaginationBar,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  listPageRootClassName,
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

const DEFAULT_BG = "#DBEAFE";
const DEFAULT_TEXT = "#1E40AF";

function normalizeHex(raw: string | null | undefined, fallback: string): string {
  const t = (raw ?? "").trim();
  if (!t) return fallback;
  const h = t.startsWith("#") ? t : `#${t}`;
  if (h.length === 4) return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
  return h.slice(0, 7).toLowerCase();
}

function bgHex(row: Tag): string {
  const value = (row as Tag & { bg_color?: string | null }).bg_colour ?? (row as Tag & { bg_color?: string | null }).bg_color;
  return normalizeHex(value, DEFAULT_BG);
}

function textHex(row: Tag): string {
  const value = (row as Tag & { text_color?: string | null }).text_colour ?? (row as Tag & { text_color?: string | null }).text_color;
  return normalizeHex(value, DEFAULT_TEXT);
}

function formatTagRowLabel(row: Tag): string {
  return row.name?.trim() || row.tag_name?.trim() || `Tag #${row.id}`;
}

function tagUserLabel(user: Tag["created_by"]): string {
  if (!user) return "—";
  const name = user.username?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email;
  return `#${user.id}`;
}

function TagChip({ row, className }: { row: Tag; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full border border-black/10 px-3 py-1 text-xs font-semibold shadow-sm",
        className,
      )}
      style={{ backgroundColor: bgHex(row as Tag), color: textHex(row as Tag) }}
    >
      {formatTagRowLabel(row)}
    </span>
  );
}

export function TagSettingsPanel() {
  const t = useTranslations("Dashboard.tags");
  const tList = useTranslations("Dashboard.list");
  const tCustomization = useTranslations("Dashboard.settingsNav.customization");
  const dateFmt = useDashboardDateFormat();
  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } = useListUrlState();

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const commitSearch = React.useCallback((q: string) => {
    const trimmed = q.trim();
    setUrl({ search: trimmed || null, page: null }, { replace: true });
  }, [setUrl]);

  const [items, setItems] = React.useState<Tag[]>([]);
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
  const [detailRow, setDetailRow] = React.useState<Tag | null>(null);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Tag | null>(null);
  const [tagName, setTagName] = React.useState("");
  const [bgColour, setBgColour] = React.useState(DEFAULT_BG);
  const [textColour, setTextColour] = React.useState(DEFAULT_TEXT);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{ tag_name?: string; bg_colour?: string; text_colour?: string }>({});

  const [deleteTarget, setDeleteTarget] = React.useState<Tag | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchTagsPage(page, pageSize, {
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

  function openCreate() {
    setDetailRow(null);
    setEditing(null);
    setTagName("");
    setBgColour(DEFAULT_BG);
    setTextColour(DEFAULT_TEXT);
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(row: Tag) {
    setDetailRow(null);
    setEditing(row);
    setTagName(formatTagRowLabel(row));
    setBgColour(bgHex(row));
    setTextColour(textHex(row));
    setErrors({});
    setFormOpen(true);
  }

  async function submitForm() {
    const formSchema = z.object({
      tag_name: zTrimmedNonEmpty(t("validationName")),
      bg_colour: zHexColour6(t("validationHex")),
      text_colour: zHexColour6(t("validationHex")),
    });
    const parsed = formSchema.safeParse({ tag_name: tagName, bg_colour: bgColour, text_colour: textColour });
    if (!parsed.success) {
      const nextErrors: { tag_name?: string; bg_colour?: string; text_colour?: string } = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field === "tag_name") nextErrors.tag_name = String(issue.message);
        if (field === "bg_colour") nextErrors.bg_colour = String(issue.message);
        if (field === "text_colour") nextErrors.text_colour = String(issue.message);
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const { tag_name: name, bg_colour: bg, text_colour: fg } = parsed.data;
    setSaving(true);
    try {
      if (editing) {
        await updateTag(editing.id, { name, bg_colour: bg, text_colour: fg });
        toastSuccess(t("saved"));
      } else {
        await createTag({ name, bg_colour: bg, text_colour: fg });
        toastSuccess(t("created"));
      }
      setFormOpen(false);
      if (!editing) setUrl({ page: null });
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      reportLocalFormSubmitApiError(
        error,
        (fieldErrors) => setErrors((prev) => ({ ...prev, ...fieldErrors })),
        undefined,
        {
          fieldMap: {
            name: "tag_name",
            bg_color: "bg_colour",
            text_color: "text_colour",
          },
        },
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTag(deleteTarget.id);
      toastSuccess(t("deleted"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(row: Tag, next: boolean) {
    setTogglingId(row.id);
    try {
      await updateTag(row.id, { is_active: next });
      toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
      setDetailRow((prev) => (prev?.id === row.id ? { ...prev, is_active: next } : prev));
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      toastApiError(error, t("toggleActiveError"));
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
    const c = entityCol<Tag>();
    return [
      c.custom("tag", t("table.tag"), (row) => <TagChip row={row} />),
      c.custom(
        "created",
        t("table.created"),
        (row) => (
          <>
            <span className="block text-slate-500 dark:text-slate-400">{dateFmt.format(new Date(row.created_at))}</span>
            {tagUserLabel(row.created_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">{tagUserLabel(row.created_by)}</span>
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
            {tagUserLabel(row.modified_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">{tagUserLabel(row.modified_by)}</span>
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
            <div className="p-4 sm:p-6"><ListPageCardGrid>{Array.from({ length: 6 }, (_, i) => <ListPageCardSkeleton key={i} />)}</ListPageCardGrid></div>
          ) : (
            <div className="space-y-2 p-6"><div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /><div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /><div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
          )
        ) : items.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "pinStatus",
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
                  title={<TagChip row={row} className="text-sm font-semibold" />}
                  meta={<>{t("detail.updatedAt")}: {dateFmt.format(new Date(row.modified_at))}{tagUserLabel(row.modified_by) !== "—" ? ` · ${tagUserLabel(row.modified_by)}` : ""}</>}
                  description={`${t("detail.createdAt")}: ${dateFmt.format(new Date(row.created_at))}${tagUserLabel(row.created_by) !== "—" ? ` · ${t("detail.byUser", { user: tagUserLabel(row.created_by) })}` : ""} · ${bgHex(row).toUpperCase()} / ${textHex(row).toUpperCase()}`}
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

      <DetailPanel
        open={detailRow !== null}
        onClose={() => setDetailRow(null)}
        title={
          detailRow ? (
            <SettingsDetailTitle
              name={formatTagRowLabel(detailRow)}
              bgColour={bgHex(detailRow)}
              textColour={textHex(detailRow)}
            />
          ) : null
        }
        subtitle={
          detailRow ? (
            <SettingsDetailIdSubtitle
              idLabel={t("detail.idLabel", { id: detailRow.id })}
              extra={detailRow.uuid || undefined}
            />
          ) : undefined
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
              toggleLabel={detailRow.is_active === true ? t("deactivate") : t("activate")}
              toggleLoading={togglingId === detailRow.id}
              toggleDisabled={togglingId === detailRow.id}
              onToggle={() => void handleToggleActive(detailRow, detailRow.is_active !== true)}
            />
          ) : undefined
        }
      >
        {detailRow ? (
          <SettingsDetailList>
            <SettingsDetailRow label={t("table.tag")}>
              <SettingsDetailTextValue>{formatTagRowLabel(detailRow)}</SettingsDetailTextValue>
            </SettingsDetailRow>
            {detailRow.uuid ? (
              <SettingsDetailRow label="UUID">
                <SettingsDetailTextValue mono>{detailRow.uuid}</SettingsDetailTextValue>
              </SettingsDetailRow>
            ) : null}
            <SettingsDetailRow label={t("status.active")}>
              <SettingsDetailStatusValue
                active={detailRow.is_active === true}
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
            <SettingsDetailRow label="Organization">
              <SettingsDetailTextValue muted={!detailRow.organization}>
                {detailRow.organization ?? "—"}
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
        titleId="tag-form-title"
        closeOnBackdrop={!saving}
        isBusy={saving}
        footer={<><AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => setFormOpen(false)}>{t("modal.cancel")}</AppButton><AppButton type="button" variant="primary" size="sm" loading={saving} onClick={() => void submitForm()}>{t("modal.save")}</AppButton></>}
      >
        <div className="flex flex-col gap-4">
          <FieldGroup label={<span>{t("modal.tagName")} <span className="text-red-500">*</span></span>} htmlFor="tag-name">
            <input id="tag-name" value={tagName} onChange={(e) => { setTagName(sanitizeTitleInput(e.target.value)); if (errors.tag_name) setErrors((prev) => ({ ...prev, tag_name: undefined })); }} className={cn(surfaceInputClassName, errors.tag_name && "border-red-500 focus:border-red-500 focus:ring-red-500/20")} autoComplete="off" />
            {errors.tag_name ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.tag_name}</p> : null}
          </FieldGroup>
          <div>
            <span className={fieldLabelClassName}>{t("modal.bgColour")} <span className="text-red-500">*</span></span>
            <div className="mt-1.5 flex items-center gap-2">
              <input type="color" value={normalizeHex(bgColour, DEFAULT_BG).slice(0, 7)} onChange={(e) => setBgColour(e.target.value)} className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600" aria-label={t("modal.bgColour")} />
              <input value={bgColour} onChange={(e) => { setBgColour(e.target.value); if (errors.bg_colour) setErrors((prev) => ({ ...prev, bg_colour: undefined })); }} className={cn(surfaceInputClassName, "px-3 font-mono", errors.bg_colour && "border-red-500 focus:border-red-500 focus:ring-red-500/20")} placeholder={t("hexPlaceholder")} spellCheck={false} />
            </div>
            {errors.bg_colour ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.bg_colour}</p> : null}
          </div>
          <div>
            <span className={fieldLabelClassName}>{t("modal.textColour")} <span className="text-red-500">*</span></span>
            <div className="mt-1.5 flex items-center gap-2">
              <input type="color" value={normalizeHex(textColour, DEFAULT_TEXT).slice(0, 7)} onChange={(e) => setTextColour(e.target.value)} className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600" aria-label={t("modal.textColour")} />
              <input value={textColour} onChange={(e) => { setTextColour(e.target.value); if (errors.text_colour) setErrors((prev) => ({ ...prev, text_colour: undefined })); }} className={cn(surfaceInputClassName, "px-3 font-mono", errors.text_colour && "border-red-500 focus:border-red-500 focus:ring-red-500/20")} placeholder={t("hexPlaceholder")} spellCheck={false} />
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
        highlight={deleteTarget ? formatTagRowLabel(deleteTarget) : undefined}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
