"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import {
  createPinStatus,
  deletePinStatus,
  fetchPinStatusesPage,
  updatePinStatus,
} from "@/features/pin-status/api/pin-status.api";
import type { PinStatus } from "@/features/pin-status/types/pin-status.types";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { cn } from "@/core/utils/http.util";
import { useListUrlState } from "@/shared/hooks/use-list-url-state";
import {
  AppButton,
  AppModal,
  ConfirmDialog,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableScroll,
  DataTableTd,
  DataTablePaginationBar,
  DataTableTh,
  DetailPanel,
  FieldGroup,
  ListPageSearchField,
  SurfaceShell,
  fieldLabelClassName,
  surfaceInputClassName,
} from "@/shared/ui";
import { zHexColour6, zTrimmedNonEmpty } from "@/shared/form";

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

export function PinStatusSettingsPanel() {
  const t = useTranslations("Dashboard.pinStatus");
  const tList = useTranslations("Dashboard.list");
  const locale = useLocale();
  const { page, search, setUrl, setPage } = useListUrlState();

  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );
  const [items, setItems] = React.useState<PinStatus[]>([]);
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

  const [detailRow, setDetailRow] = React.useState<PinStatus | null>(null);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PinStatus | null>(null);
  const [statusName, setStatusName] = React.useState("");
  const [bgColour, setBgColour] = React.useState(DEFAULT_BG);
  const [textColour, setTextColour] = React.useState(DEFAULT_TEXT);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    status_name?: string;
    bg_colour?: string;
    text_colour?: string;
  }>({});

  const [deleteTarget, setDeleteTarget] = React.useState<PinStatus | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchPinStatusesPage(page, 20, {
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
  }, [page, search, refreshNonce, t]);

  function openCreate() {
    setEditing(null);
    setStatusName("");
    setBgColour(DEFAULT_BG);
    setTextColour(DEFAULT_TEXT);
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(row: PinStatus) {
    setEditing(row);
    setStatusName(row.status_name);
    setBgColour(normalizeHex(row.bg_colour));
    setTextColour(normalizeHex(row.text_colour));
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
      const issue = parsed.error.issues[0];
      toastError(typeof issue.message === "string" ? issue.message : t("validationName"));
      return;
    }

    setErrors({});
    const { status_name: name, bg_colour: bg, text_colour: fg } = parsed.data;

    setSaving(true);
    try {
      if (editing) {
        await updatePinStatus(editing.id, {
          status_name: name,
          bg_colour: bg,
          text_colour: fg,
        });
        toastSuccess(t("saved"));
      } else {
        await createPinStatus({ status_name: name, bg_colour: bg, text_colour: fg });
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
      await deletePinStatus(deleteTarget.id);
      toastSuccess(t("deleted"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <ListPageSearchField
          value={search}
          onCommit={commitSearch}
          placeholder={tList("searchPlaceholder")}
          ariaLabel={tList("searchAria")}
          className="sm:max-w-sm"
        />
        <AppButton type="button" variant="primary" size="md" onClick={openCreate} className="shrink-0 gap-2 self-start sm:self-center">
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          {t("add")}
        </AppButton>
      </div>

      <SurfaceShell>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : loading ? (
          <div className="space-y-2 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">{t("empty")}</p>
        ) : (
          <DataTableScroll>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableTh>{t("table.status")}</DataTableTh>
                  <DataTableTh>{t("table.preview")}</DataTableTh>
                  <DataTableTh className="hidden sm:table-cell">{t("table.created")}</DataTableTh>
                  <DataTableTh className="w-[120px] text-right">{t("table.actions")}</DataTableTh>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {items.map((row) => (
                  <DataTableRow key={row.id} clickable onClick={() => setDetailRow(row)}>
                    <DataTableTd className="font-medium text-slate-900 dark:text-slate-100">
                      {row.status_name}
                    </DataTableTd>
                    <DataTableTd>
                      <span
                        className="inline-flex rounded-md border border-black/5 px-2.5 py-1 text-xs font-semibold shadow-sm"
                        style={{
                          backgroundColor: normalizeHex(row.bg_colour),
                          color: normalizeHex(row.text_colour),
                        }}
                      >
                        {row.status_name}
                      </span>
                    </DataTableTd>
                    <DataTableTd className="hidden text-slate-500 dark:text-slate-400 sm:table-cell">
                      {dateFmt.format(new Date(row.created_at))}
                    </DataTableTd>
                    <DataTableTd className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(row);
                          }}
                          aria-label={t("edit")}
                          title={t("edit")}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(row);
                          }}
                          aria-label={t("delete")}
                          title={t("delete")}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
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
            summary={t("pageLabel", {
              current: pagination.current_page,
              total: pagination.total_pages,
              count: pagination.total_records,
            })}
            prevLabel={t("prev")}
            nextLabel={t("next")}
            onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
            onNext={() => setPage(pagination.current_page + 1)}
          />
        ) : null}
      </SurfaceShell>

      <DetailPanel
        open={detailRow !== null}
        onClose={() => setDetailRow(null)}
        title={detailRow?.status_name ?? ""}
        subtitle={
          detailRow ? (
            <span className="text-slate-500 dark:text-slate-400">
              {`${t("table.created")} · ${dateFmt.format(new Date(detailRow.created_at))}`}
            </span>
          ) : undefined
        }
        footer={
          detailRow ? (
            <>
              <AppButton type="button" variant="secondary" size="md" onClick={() => setDetailRow(null)}>
                {t("modal.cancel")}
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                size="md"
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
                variant="danger"
                size="md"
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
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("table.preview")}
              </p>
              <div className="mt-2">
                <span
                  className="inline-flex rounded-md border border-black/5 px-2.5 py-1 text-xs font-semibold shadow-sm"
                  style={{
                    backgroundColor: normalizeHex(detailRow.bg_colour),
                    color: normalizeHex(detailRow.text_colour),
                  }}
                >
                  {detailRow.status_name}
                </span>
              </div>
            </div>
            <FieldGroup label={t("modal.bgColour")}>
              <p className="font-mono text-sm text-slate-700 dark:text-slate-200">{normalizeHex(detailRow.bg_colour)}</p>
            </FieldGroup>
            <FieldGroup label={t("modal.textColour")}>
              <p className="font-mono text-sm text-slate-700 dark:text-slate-200">{normalizeHex(detailRow.text_colour)}</p>
            </FieldGroup>
          </div>
        ) : null}
      </DetailPanel>

      <AppModal
        open={formOpen}
        onClose={() => (!saving ? setFormOpen(false) : undefined)}
        title={editing ? t("modal.editTitle") : t("modal.createTitle")}
        titleId="pin-status-form-title"
        closeOnBackdrop={!saving}
        isBusy={saving}
        footer={
          <>
            <AppButton type="button" variant="secondary" size="md" disabled={saving} onClick={() => setFormOpen(false)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="button" variant="primary" size="md" loading={saving} onClick={() => void submitForm()}>
              {t("modal.save")}
            </AppButton>
          </>
        }
      >
        <div className="space-y-4">
          <FieldGroup label={`${t("modal.statusName")} *`} htmlFor="pin-status-name">
            <input
              id="pin-status-name"
              value={statusName}
              onChange={(e) => {
                setStatusName(e.target.value);
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
