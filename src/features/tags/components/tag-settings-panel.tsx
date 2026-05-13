"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import { createTag, deleteTag, fetchTagsPage, updateTag } from "@/features/tags/api/tag.api";
import type { Tag } from "@/features/tags/types/tag.types";
import { zHexColour6, zTrimmedNonEmpty } from "@/shared/form";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import {
  AppButton,
  AppModal,
  ConfirmDialog,
  DashboardEmptyState,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTablePaginationBar,
  DataTableRow,
  DataTableRowActionsMenu,
  DataTableScroll,
  DataTableTd,
  DataTableTh,
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
  const locale = useLocale();
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

  const dateFmt = React.useMemo(() => new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }), [locale]);
  const hasActiveFilters = hasListActiveFilters({ search });
  const hideListChrome = !loadError && !loading && items.length === 0 && !hasActiveFilters;
  const pageRange = getListPageRange(pagination);

  return (
    <div className="space-y-6">
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={hasActiveFilters}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          action={
            <AppButton type="button" variant="primary" size="sm" onClick={openCreate} className="gap-2">
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              {t("add")}
            </AppButton>
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

      <SurfaceShell className={hideListChrome ? "rounded-none border-dashed" : "rounded-none"}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : loading ? (
          listViewMode === "list" ? (
            <div className="p-4 sm:p-6"><ListPageCardGrid>{Array.from({ length: 6 }, (_, i) => <ListPageCardSkeleton key={i} />)}</ListPageCardGrid></div>
          ) : (
            <div className="space-y-2 p-6"><div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /><div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /><div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
          )
        ) : items.length === 0 ? (
          hasActiveFilters ? (
            <DashboardEmptyState iconName="noResults" title={tList("noResultsTitle")} description={tList("noResultsDescription")} action={<AppButton type="button" variant="secondary" size="md" onClick={() => setUrl({ search: null, page: null }, { replace: true })}>{tList("clearFilters")}</AppButton>} />
          ) : (
            <DashboardEmptyState iconName="pinStatus" title={t("emptyTitle")} description={t("emptyDescription")} action={<AppButton type="button" variant="primary" size="md" onClick={openCreate} className="gap-2"><Plus className="size-4" strokeWidth={2} aria-hidden />{t("add")}</AppButton>} />
          )
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
                  menu={<DataTableRowActionsMenu menuAriaLabel={tList("openRowActions")} items={[{ id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row) }, { id: "delete", label: t("delete"), icon: Trash2, tone: "danger", onSelect: () => { setDetailRow(null); setDeleteTarget(row); } }]} />}
                />
              ))}
            </ListPageCardGrid>
          </div>
        ) : (
          <DataTableScroll>
            <DataTable>
              <DataTableHead><tr><DataTableTh>{t("table.tag")}</DataTableTh><DataTableTh className="hidden sm:table-cell">{t("table.created")}</DataTableTh><DataTableTh className="hidden md:table-cell">{t("table.updated")}</DataTableTh><DataTableTh narrow><span className="sr-only">{t("table.actions")}</span></DataTableTh></tr></DataTableHead>
              <DataTableBody>
                {items.map((row) => (
                  <DataTableRow key={row.id} clickable onClick={() => setDetailRow(row)}>
                    <DataTableTd><TagChip row={row} /></DataTableTd>
                    <DataTableTd className="hidden text-slate-500 dark:text-slate-400 sm:table-cell"><span className="block">{dateFmt.format(new Date(row.created_at))}</span>{tagUserLabel(row.created_by) !== "—" ? <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">{tagUserLabel(row.created_by)}</span> : null}</DataTableTd>
                    <DataTableTd className="hidden text-slate-500 dark:text-slate-400 md:table-cell"><span className="block">{dateFmt.format(new Date(row.modified_at))}</span>{tagUserLabel(row.modified_by) !== "—" ? <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">{tagUserLabel(row.modified_by)}</span> : null}</DataTableTd>
                    <DataTableTd narrow onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <DataTableRowActionsMenu menuAriaLabel={tList("openRowActions")} items={[{ id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row) }, { id: "delete", label: t("delete"), icon: Trash2, tone: "danger", onSelect: () => { setDetailRow(null); setDeleteTarget(row); } }]} />
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </DataTableScroll>
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
        title={detailRow ? <TagChip row={detailRow} className="text-base font-semibold" /> : null}
        subtitle={detailRow ? <span className="text-sm text-slate-500 dark:text-slate-400">{detailRow.uuid ? `${t("detail.idLabel", { id: detailRow.id })} · ${detailRow.uuid}` : t("detail.idLabel", { id: detailRow.id })}</span> : undefined}
        footer={detailRow ? <><AppButton type="button" variant="secondary" size="md" onClick={() => setDetailRow(null)}>{t("modal.cancel")}</AppButton><AppButton type="button" variant="secondary" size="md" onClick={() => { const row = detailRow; setDetailRow(null); openEdit(row); }}>{t("edit")}</AppButton><AppButton type="button" variant="danger" size="md" onClick={() => { const row = detailRow; setDetailRow(null); setDeleteTarget(row); }}>{t("delete")}</AppButton></> : undefined}
      >
        {detailRow ? (
          <div className="space-y-5">
            <FieldGroup label={t("table.tag")}><p className="text-sm text-slate-800 dark:text-slate-200">{formatTagRowLabel(detailRow)}</p></FieldGroup>
            {detailRow.uuid ? (
              <FieldGroup label="UUID">
                <p className="break-all font-mono text-xs text-slate-700 dark:text-slate-200">{detailRow.uuid}</p>
              </FieldGroup>
            ) : null}
            <FieldGroup label={t("modal.bgColour")}><div className="flex items-center gap-3"><span className="size-8 shrink-0 rounded-none border border-slate-200 dark:border-slate-600" style={{ backgroundColor: bgHex(detailRow) }} aria-hidden /><p className="font-mono text-sm text-slate-700 dark:text-slate-200">{bgHex(detailRow).toUpperCase()}</p></div></FieldGroup>
            <FieldGroup label={t("modal.textColour")}><div className="flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-none border border-slate-200 text-xs font-bold dark:border-slate-600" style={{ backgroundColor: bgHex(detailRow), color: textHex(detailRow) }} aria-hidden>Aa</span><p className="font-mono text-sm text-slate-700 dark:text-slate-200">{textHex(detailRow).toUpperCase()}</p></div></FieldGroup>
            <FieldGroup label="Active"><p className="text-sm text-slate-800 dark:text-slate-200">{detailRow.is_active ? "Yes" : "No"}</p></FieldGroup>
            <FieldGroup label="Organization"><p className="text-sm text-slate-800 dark:text-slate-200">{detailRow.organization ?? "—"}</p></FieldGroup>
            <FieldGroup label={t("detail.createdAt")}><p className="text-sm text-slate-800 dark:text-slate-200">{dateFmt.format(new Date(detailRow.created_at))}</p>{tagUserLabel(detailRow.created_by) !== "—" ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("detail.byUser", { user: tagUserLabel(detailRow.created_by) })}</p> : null}</FieldGroup>
            <FieldGroup label={t("detail.updatedAt")}><p className="text-sm text-slate-800 dark:text-slate-200">{dateFmt.format(new Date(detailRow.modified_at))}</p>{tagUserLabel(detailRow.modified_by) !== "—" ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("detail.byUser", { user: tagUserLabel(detailRow.modified_by) })}</p> : null}</FieldGroup>
          </div>
        ) : null}
      </DetailPanel>

      <AppModal
        open={formOpen}
        onClose={() => (!saving ? setFormOpen(false) : undefined)}
        title={editing ? t("modal.editTitle") : t("modal.createTitle")}
        titleId="tag-form-title"
        closeOnBackdrop={!saving}
        isBusy={saving}
        footer={<><AppButton type="button" variant="secondary" size="md" disabled={saving} onClick={() => setFormOpen(false)}>{t("modal.cancel")}</AppButton><AppButton type="button" variant="primary" size="md" loading={saving} onClick={() => void submitForm()}>{t("modal.save")}</AppButton></>}
      >
        <div className="space-y-4">
          <FieldGroup label={<span>{t("modal.tagName")} <span className="text-red-500">*</span></span>} htmlFor="tag-name">
            <input id="tag-name" value={tagName} onChange={(e) => { setTagName(capitalizeFirstLetter(e.target.value)); if (errors.tag_name) setErrors((prev) => ({ ...prev, tag_name: undefined })); }} className={cn(surfaceInputClassName, errors.tag_name && "border-red-500 focus:border-red-500 focus:ring-red-500/20")} autoComplete="off" />
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
