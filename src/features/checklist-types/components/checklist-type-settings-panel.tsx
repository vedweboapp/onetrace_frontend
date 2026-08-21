"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import {
  createChecklistType,
  deleteChecklistType,
  fetchChecklistTypesPage,
  patchChecklistType,
  updateChecklistType,
} from "@/features/checklist-types/api/checklist-type.api";
import type { ChecklistType } from "@/features/checklist-types/types/checklist-type.types";
import {
  formatChecklistTypeLabel,
  projectTypeIdFromChecklistRow,
  projectTypeLabelFromChecklistRow,
} from "@/features/checklist-types/utils/checklist-type-display.util";
import { fetchProjectTypesPage } from "@/features/project-types/api/project-type.api";
import { formatProjectTypeLabel } from "@/features/project-types/utils/project-type-display.util";
import { reportLocalFormSubmitApiError, zTrimmedNonEmpty } from "@/shared/form";
import { ChecklistTypeSortableTable } from "@/features/checklist-types/components/checklist-type-sortable-table";
import {
  SettingsDetailActions,
  SettingsDetailList,
  SettingsDetailRow,
  SettingsDetailStatusValue,
  SettingsDetailTextValue,
  SettingsDetailTimestampValue,
  SettingsDetailTitle,
  settingsDetailUserLabel,
} from "@/shared/components/settings/settings-detail-view";
import {
  toastError,
  toastSuccess,
  toastApiError,
  getApiErrorDisplayMessage,
} from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import {
  hasListActiveFilters,
  useListUrlState,
} from "@/shared/hooks/use-list-url-state";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import {
  applySequencesToItems,
  checklistSequenceUpdates,
} from "@/features/checklist-types/utils/checklist-type-sequence.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { reorderArray } from "@/shared/utils/reorder-array.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { routes } from "@/shared/config/routes";
import { Paperclip, X } from "lucide-react";
import {
  ActiveStatusBadge,
  AddButton,
  AppButton,
  AppModal,
  CheckmarkSelect,
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
  surfaceInputClassName,
} from "@/shared/ui";

const CHECKLIST_DND_TYPE = "application/x-checklist-type-order";

function checklistTypeUserLabel(user: ChecklistType["created_by"]): string {
  if (!user) return "—";
  const name = user.username?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email;
  return `#${user.id}`;
}

function formatOptionalDate(
  dateFmt: Intl.DateTimeFormat,
  value: string | null,
): string {
  if (!value?.trim()) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

export function ChecklistTypeSettingsPanel() {
  const t = useTranslations("Dashboard.checklistTypes");
  const tList = useTranslations("Dashboard.list");
  const tCustomization = useTranslations("Dashboard.settingsNav.customization");
  const dateFmt = useDashboardDateFormat();
  const searchParams = useSearchParams();
  const {
    page,
    pageSize,
    listViewMode,
    search,
    setUrl,
    setPage,
    setPageSize,
    setListViewMode,
  } = useListUrlState();

  const projectTypeParam = searchParams.get("project_type");
  const projectTypeFilter =
    projectTypeParam && /^\d+$/.test(projectTypeParam)
      ? Number.parseInt(projectTypeParam, 10)
      : undefined;

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  const [items, setItems] = React.useState<ChecklistType[]>([]);
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
  const [detailRow, setDetailRow] = React.useState<ChecklistType | null>(null);
  const [togglingId, setTogglingId] = React.useState<number | null>(null);

  const [projectTypeOptions, setProjectTypeOptions] = React.useState<
    { value: string; label: string }[]
  >([]);
  const [initialValues, setInitialValues] = React.useState<{
  title: string;
  projectTypeId: string;
  isRequired: boolean;
  concentricPoint: boolean;
} | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ChecklistType | null>(null);
  const [title, setTitle] = React.useState("");
  const [projectTypeId, setProjectTypeId] = React.useState("");
  const [isRequired, setIsRequired] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  // const [errors, setErrors] = React.useState<{ title?: string; project_type?: string }>({});
  const [file, setFile] = React.useState<File | null>(null);
  const [existingFileName, setExistingFileName] = React.useState<string | null>(
    null,
  );
  const [concentricPoint, setConcentricPoint] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    title?: string;
    project_type?: string;
    file?: string;
  }>({});
  const [deleteTarget, setDeleteTarget] = React.useState<ChecklistType | null>(
    null,
  );
  const [deleting, setDeleting] = React.useState(false);
  const [reordering, setReordering] = React.useState(false);
  const [dragFromIndex, setDragFromIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: projectTypes } = await fetchProjectTypesPage(1, 500, {
          is_active: true,
        });
        if (!cancelled) {
          setProjectTypeOptions(
            projectTypes.map((pt) => ({
              value: String(pt.id),
              label: formatProjectTypeLabel(pt),
            })),
          );
        }
      } catch (error) {
        if (!cancelled) setProjectTypeOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } =
          await fetchChecklistTypesPage(page, pageSize, {
            search: search || undefined,
            project_type: projectTypeFilter,
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
  }, [
    page,
    pageSize,
    refreshNonce,
    search,
    projectTypeFilter,
    t,
  ]);

  const hasActiveFilters = hasListActiveFilters({
    search,
    projectTypeParam,
  });
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });

const openEdit = React.useCallback((row: ChecklistType) => {
  setDetailRow(null);
  setEditing(row);
  const initTitle = formatChecklistTypeLabel(row);
  const ptId = projectTypeIdFromChecklistRow(row);
  const initProjectTypeId = ptId ? String(ptId) : "";
  setTitle(initTitle);
  setProjectTypeId(initProjectTypeId);
  setIsRequired(row.is_required);
  setConcentricPoint(row.concentric_point ?? false);
  setFile(null);
  setExistingFileName(row.file ? row.file.split("/").pop() ?? row.file : null);
  setInitialValues({
    title: initTitle,
    projectTypeId: initProjectTypeId,
    isRequired: row.is_required,
    concentricPoint: row.concentric_point ?? false,
  });
  setErrors({});
  setFormOpen(true);
}, []);

function openCreate() {
  setDetailRow(null);
  setEditing(null);
  setTitle("");
  setProjectTypeId("");
  setIsRequired(true);
  setConcentricPoint(false);
  setFile(null);
  setExistingFileName(null);
  setInitialValues(null);
  setErrors({});
  setFormOpen(true);
}
  async function handleToggleActive(row: ChecklistType, next: boolean) {
    setTogglingId(row.id);
    try {
      await patchChecklistType(row.id, { is_active: next });
      toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
      setDetailRow((prev) =>
        prev?.id === row.id ? { ...prev, is_active: next } : prev,
      );
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      toastApiError(error, t("toggleActiveError"));
    } finally {
      setTogglingId(null);
    }
  }

  const handleReorder = React.useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (reordering || fromIndex === toIndex || fromIndex < 0 || toIndex < 0)
        return;
      const prev = items;
      const reordered = reorderArray(items, fromIndex, toIndex);
      const withSequences = applySequencesToItems(reordered, page, pageSize);
      const updates = checklistSequenceUpdates(prev, withSequences);
      if (updates.length === 0) return;

      setItems(withSequences);
      setReordering(true);
      try {
        await Promise.all(
          updates.map((u) =>
            patchChecklistType(u.id, { sequence: u.sequence }),
          ),
        );
        toastSuccess(t("sequenceUpdated"));
        setRefreshNonce((n) => n + 1);
      } catch (error) {
        setItems(prev);
        toastApiError(error, t("sequenceUpdateError"));
      } finally {
        setReordering(false);
        setDragFromIndex(null);
      }
    },
    [items, page, pageSize, reordering, t],
  );


async function submitForm() {
  const formSchema = z.object({
    title: zTrimmedNonEmpty(t("validationTitle")),
    project_type: z
      .string()
      .trim()
      .min(1, t("validationProjectType"))
      .refine((v) => /^\d+$/.test(v) && Number.parseInt(v, 10) > 0, t("validationProjectType")),
  });
  const parsed = formSchema.safeParse({ title, project_type: projectTypeId });

  const nextErrors: { title?: string; project_type?: string; file?: string } = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field === "title") nextErrors.title = String(issue.message);
      if (field === "project_type") nextErrors.project_type = String(issue.message);
    }
  }

  if (!editing && !file) {
    nextErrors.file = t("validationFile");
  }

  if (Object.keys(nextErrors).length > 0) {
    setErrors(nextErrors);
    return;
  }

  if (!parsed.success) return;

  setErrors({});
  const { title: nextTitle, project_type: ptRaw } = parsed.data;
  const projectType = Number.parseInt(ptRaw, 10);

  const payload = new FormData();


if (editing && initialValues) {
  if (nextTitle !== initialValues.title) {
    payload.append("title", nextTitle);
  }
  payload.append("project_type", String(projectType));
  if (isRequired !== initialValues.isRequired) {
    payload.append("is_required", String(isRequired));
  }
  if (concentricPoint !== initialValues.concentricPoint) {
    payload.append("concentric_point", String(concentricPoint));
  }
  if (file) {
    payload.append("file", file);
  }

  if (Array.from(payload.keys()).length === 0) {
    setFormOpen(false);
    return;
  }
} else {
  payload.append("title", nextTitle);
  payload.append("project_type", String(projectType));
  payload.append("is_required", String(isRequired));
  payload.append("concentric_point", String(concentricPoint));
  if (file) {
    payload.append("file", file);
  }
}

  setSaving(true);
  try {
    if (editing) {
      await updateChecklistType(editing.id, payload);
      toastSuccess(t("saved"));
    } else {
      await createChecklistType(payload);
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
      await deleteChecklistType(deleteTarget.id);
      toastSuccess(t("deleted"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

  const pageRange = getListPageRange(pagination);

  const formatCreatedCell = React.useCallback(
    (row: ChecklistType) => (
      <>
        <span className="block text-slate-500 dark:text-slate-400">
          {formatOptionalDate(dateFmt, row.created_at)}
        </span>
        {checklistTypeUserLabel(row.created_by) !== "—" ? (
          <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
            {checklistTypeUserLabel(row.created_by)}
          </span>
        ) : null}
      </>
    ),
    [dateFmt],
  );

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
                placeholder={t("searchPlaceholder")}
                ariaLabel={tList("searchAria")}
                className="sm:max-w-sm"
              />
              <CheckmarkSelect
                listLabel={t("filterProjectType")}
                emptyLabel={t("filterProjectTypePlaceholder")}
                options={projectTypeOptions}
                value={projectTypeParam ?? ""}
                searchable
                clearable
                portaled
                onChange={(v) =>
                  setUrl(
                    { project_type: v || null, page: null },
                    { replace: true },
                  )
                }
              />
            </div>
          }
        />
      ) : null}

      <SurfaceShell className={listPageSurfaceShellClassName(hideListChrome)}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">
            {loadError}
          </p>
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
              setUrl(
                {
                  search: null,
                  is_active: null,
                  project_type: null,
                  page: null,
                },
                { replace: true },
              )
            }
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              {t("reorderHint")}
            </p>
            <ListPageCardGrid>
              {items.map((row, index) => (
                <div
                  key={row.id}
                  draggable={!reordering && !listLoading}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData(CHECKLIST_DND_TYPE, String(index));
                    setDragFromIndex(index);
                  }}
                  onDragEnd={() => setDragFromIndex(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const raw = e.dataTransfer.getData(CHECKLIST_DND_TYPE);
                    const from = Number.parseInt(raw, 10);
                    if (Number.isFinite(from)) void handleReorder(from, index);
                  }}
                  className={cn(
                    "h-full",
                    dragFromIndex === index && "opacity-50",
                    reordering && "pointer-events-none",
                  )}
                >
                  <ListPageCard
                    leading={
                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <GripVertical
                          className="size-4 shrink-0 cursor-grab text-slate-400 active:cursor-grabbing"
                          aria-hidden
                        />
                        <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {row.sequence}
                        </span>
                      </div>
                    }
                    title={formatChecklistTypeLabel(row)}
                    meta={
                      <>
                        {t("table.projectType")}:{" "}
                        {projectTypeLabelFromChecklistRow(row)}
                      </>
                    }
                    description={`${t("detail.createdAt")}: ${formatOptionalDate(dateFmt, row.created_at)}${
                      checklistTypeUserLabel(row.created_by) !== "—"
                        ? ` · ${t("detail.byUser", { user: checklistTypeUserLabel(row.created_by) })}`
                        : ""
                    } · ${row.is_required ? t("required.yes") : t("required.no")}`}
                    footer={
                      <ActiveStatusBadge
                        active={row.is_active}
                        label={
                          row.is_active
                            ? t("status.active")
                            : t("status.inactive")
                        }
                      />
                    }
                    onCardClick={() => setDetailRow(row)}
                  />
                </div>
              ))}
            </ListPageCardGrid>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              {t("reorderHint")}
            </p>
            <ChecklistTypeSortableTable
              items={items}
              reordering={reordering}
              dragFromIndex={dragFromIndex}
              onDragFromIndexChange={setDragFromIndex}
              onReorder={(from, to) => void handleReorder(from, to)}
              onRowClick={(row) => setDetailRow(row)}
              formatCreated={formatCreatedCell}
              labels={{
                sequence: t("table.sequence"),
                title: t("table.title"),
                projectType: t("table.projectType"),
                required: t("table.required"),
                requiredYes: t("required.yes"),
                requiredNo: t("required.no"),
                status: t("table.status"),
                active: t("status.active"),
                inactive: t("status.inactive"),
                created: t("table.created"),
              }}
            />
          </div>
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
              name={formatChecklistTypeLabel(detailRow)}
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
            <SettingsDetailRow label={t("table.title")}>
              <SettingsDetailTextValue>{formatChecklistTypeLabel(detailRow)}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.projectType")}>
              <SettingsDetailTextValue>{projectTypeLabelFromChecklistRow(detailRow)}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.sequence")}>
              <SettingsDetailTextValue>{detailRow.sequence}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.required")}>
              <SettingsDetailTextValue>
                {detailRow.is_required ? t("required.yes") : t("required.no")}
              </SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("modal.file")}>
              {detailRow.file ? (
                <a
                  href={detailRow.file ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {detailRow.file.split("/").pop() ?? detailRow.file}
                </a>
              ) : (
                <SettingsDetailTextValue muted>{t("modal.noFile")}</SettingsDetailTextValue>
              )}
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
        titleId="checklist-type-form-title"
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
        <div className="flex flex-col gap-4">
          <FieldGroup
            label={
              <span>
                {t("modal.title")} <span className="text-red-500">*</span>
              </span>
            }
            htmlFor="checklist-type-title"
          >
            <input
              id="checklist-type-title"
              value={title}
              onChange={(e) => {
                setTitle(sanitizeTitleInput(e.target.value));
                if (errors.title)
                  setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              className={cn(
                surfaceInputClassName,
                errors.title &&
                  "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              )}
              autoComplete="off"
            />
            {errors.title ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.title}
              </p>
            ) : null}
          </FieldGroup>
          <FieldGroup
            label={
              <span>
                {t("modal.projectType")} <span className="text-red-500">*</span>
              </span>
            }
          >
            <CheckmarkSelect
              listLabel={t("modal.projectType")}
              emptyLabel={t("filterProjectTypePlaceholder")}
              options={projectTypeOptions}
              value={projectTypeId}
              searchable
              clearable
              portaled
              onChange={(v) => {
                setProjectTypeId(v);
                if (errors.project_type)
                  setErrors((prev) => ({ ...prev, project_type: undefined }));
              }}
            />
            {errors.project_type ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.project_type}
              </p>
            ) : null}
          </FieldGroup>
     
          <FieldGroup
            label={
              <span>
                {t("modal.file")}{" "}
                {!editing && <span className="text-red-500">*</span>}
              </span>
            }
            htmlFor="checklist-type-file"
          >
            <div className="flex items-center gap-3">
              <label
                htmlFor="checklist-type-file"
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                  "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                  errors.file && "border-red-500",
                )}
              >
                <Paperclip className="size-4" aria-hidden />
                {file ? t("modal.replaceFile") : t("modal.chooseFile")}
              </label>
              <input
                id="checklist-type-file"
                type="file"
                className="sr-only"
                disabled={saving}
                onChange={(e) => {
                  const next = e.target.files?.[0] ?? null;
                  setFile(next);
                  if (errors.file)
                    setErrors((prev) => ({ ...prev, file: undefined }));
                }}
              />

              {file ? (
                <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <span className="min-w-0 max-w-[10rem] truncate">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    aria-label={t("modal.removeFile")}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ) : existingFileName ? (
                <span className="min-w-0 max-w-[10rem] truncate text-xs text-slate-500 dark:text-slate-400">
                  {t("modal.currentFile")}: {existingFileName}
                </span>
              ) : null}
            </div>
            {errors.file ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.file}
              </p>
            ) : null}
          </FieldGroup>
          <FieldGroup label={t("modal.requiredLabel")} htmlFor="checklist-type-is-required">
  <label
    htmlFor="checklist-type-is-required"
    className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
  >
    <input
      id="checklist-type-is-required"
      type="checkbox"
      className="size-4 rounded border-slate-300"
      checked={isRequired}
      disabled={saving}
      onChange={(e) => setIsRequired(e.target.checked)}
    />
    {isRequired ? t("required.yes") : t("required.no")}
  </label>
</FieldGroup>


        </div>
      </AppModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => (!deleting ? setDeleteTarget(null) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={
          deleteTarget ? formatChecklistTypeLabel(deleteTarget) : undefined
        }
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
