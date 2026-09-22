"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { getSessionOrganizationId } from "@/features/auth/utils/get-session-organization-id";
import {
  activateKioskMachine,
  createKioskMachine,
  deleteKioskMachine,
  fetchKioskMachinesPage,
  updateKioskMachine,
} from "@/features/kiosk-machines/api/kiosk-machine.api";
import type { KioskMachine } from "@/features/kiosk-machines/types/kiosk-machine.types";
import { reportLocalFormSubmitApiError, zTrimmedNonEmpty } from "@/shared/form";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { toastSuccess, toastError, toastApiError, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { sanitizeTitleInput, sanitizeTextInput } from "@/shared/form/field-input.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
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
  FieldGroup,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
  surfaceInputClassName,
} from "@/shared/ui";

function dash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function resolveMachineOrganizationId(row: KioskMachine, sessionOrgId: number | null): number | null {
  if (typeof row.organization === "number" && Number.isFinite(row.organization)) {
    return row.organization;
  }
  return sessionOrgId;
}

export function KioskMachineSettingsPanel() {
  const t = useTranslations("Dashboard.kioskMachines");
  const tList = useTranslations("Dashboard.list");
  const dateFmt = useDashboardDateFormat();
  const sessionOrgId = useAuthStore((s) => getSessionOrganizationId(s.organizations));
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

  const [items, setItems] = React.useState<KioskMachine[]>([]);
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

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<KioskMachine | null>(null);
  const [machineCode, setMachineCode] = React.useState("");
  const [machineName, setMachineName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [locationName, setLocationName] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    machine_code?: string;
    machine_name?: string;
  }>({});

  const [deleteTarget, setDeleteTarget] = React.useState<KioskMachine | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [activatingId, setActivatingId] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchKioskMachinesPage(page, pageSize, {
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

  function openCreate() {
    setEditing(null);
    setMachineCode("");
    setMachineName("");
    setCity("");
    setLocationName("");
    setIsActive(true);
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(row: KioskMachine) {
    setEditing(row);
    setMachineCode(row.machine_code);
    setMachineName(row.machine_name);
    setCity(row.city ?? "");
    setLocationName(row.location_name ?? "");
    setIsActive(row.is_active);
    setErrors({});
    setFormOpen(true);
  }

  async function submitForm() {
    const formSchema = z.object({
      machine_code: zTrimmedNonEmpty(t("validation.machineCode")),
      machine_name: zTrimmedNonEmpty(t("validation.machineName")),
    });
    const parsed = formSchema.safeParse({ machine_code: machineCode, machine_name: machineName });
    if (!parsed.success) {
      const nextErrors: { machine_code?: string; machine_name?: string } = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field === "machine_code") nextErrors.machine_code = String(issue.message);
        if (field === "machine_name") nextErrors.machine_name = String(issue.message);
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const payload = {
        machine_code: parsed.data.machine_code,
        machine_name: parsed.data.machine_name,
        city: city.trim() || null,
        location_name: locationName.trim() || null,
      };
      if (editing) {
        await updateKioskMachine(editing.id, { ...payload, is_active: isActive });
        toastSuccess(t("saved"));
      } else {
        await createKioskMachine(payload);
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
      await deleteKioskMachine(deleteTarget.id);
      toastSuccess(t("deleted"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

  const handleActivate = React.useCallback(
    async (row: KioskMachine) => {
      const pairingCode = row.pairing_code?.trim() ?? "";
      const organizationId = resolveMachineOrganizationId(row, sessionOrgId);
      if (!pairingCode || organizationId == null) {
        toastError(t("activateMissingData"));
        return;
      }
      setActivatingId(row.id);
      try {
        const message = await activateKioskMachine({
          pairing_code: pairingCode,
          organization_id: organizationId,
        });
        toastSuccess(message || t("activatedToast"));
        setRefreshNonce((n) => n + 1);
      } catch (error) {
        toastApiError(error, t("activateError"));
      } finally {
        setActivatingId(null);
      }
    },
    [sessionOrgId, t],
  );

  const pageRange = getListPageRange(pagination);

  const rowActions = React.useCallback(
    (row: KioskMachine) => {
      const isActivating = activatingId === row.id;
      const showActivate = !row.is_activated;
      return (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {showActivate ? (
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              loading={isActivating}
              disabled={activatingId !== null}
              onClick={() => void handleActivate(row)}
            >
              {t("activate")}
            </AppButton>
          ) : null}
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            title={t("edit")}
            aria-label={t("edit")}
            disabled={activatingId !== null}
            onClick={() => openEdit(row)}
          >
            <Pencil className="size-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300"
            title={t("delete")}
            aria-label={t("delete")}
            disabled={activatingId !== null}
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      );
    },
    [t, activatingId, handleActivate],
  );

  const tableColumns = React.useMemo(() => {
    const c = entityCol<KioskMachine>();
    return [
      c.text("machine_code", t("table.code"), (r) => r.machine_code),
      c.text("machine_name", t("table.name"), (r) => r.machine_name),
      c.text("city", t("table.city"), (r) => dash(r.city), { responsive: "sm" }),
      c.text("location", t("table.location"), (r) => dash(r.location_name), { responsive: "md" }),
      c.status(
        "recordStatus",
        t("table.status"),
        (r) => r.is_active,
        t("status.active"),
        t("status.inactive"),
      ),
      c.custom(
        "activated",
        t("table.activated"),
        (row) => (
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {row.is_activated ? t("status.activated") : t("status.notActivated")}
          </span>
        ),
        { responsive: "lg" },
      ),
      c.custom(
        "created",
        t("table.created"),
        (row) => (
          <span className="block text-slate-500 dark:text-slate-400">
            {dateFmt.format(new Date(row.created_at))}
          </span>
        ),
        { responsive: "md" },
      ),
      c.actions("actions", t("table.actions"), rowActions),
    ];
  }, [t, dateFmt, rowActions]);

  return (
    <div className={listPageRootClassName()}>
      {!hideListChrome ? (
        <ListPageHeader
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
            onClearFilters={() => setUrl({ search: null, page: null }, { replace: true })}
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  title={row.machine_name}
                  meta={row.machine_code}
                  description={`${dash(row.city)} · ${dash(row.location_name)} · ${dateFmt.format(new Date(row.created_at))}`}
                  footer={
                    <div className="flex w-full items-center justify-between gap-2">
                      <ActiveStatusBadge
                        active={row.is_active}
                        label={row.is_active ? t("status.active") : t("status.inactive")}
                      />
                      {rowActions(row)}
                    </div>
                  }
                />
              ))}
            </ListPageCardGrid>
          </div>
        ) : (
          <EntityDataTable columns={tableColumns} rows={items} />
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

      <AppModal
        open={formOpen}
        onClose={() => (!saving ? setFormOpen(false) : undefined)}
        title={editing ? t("modal.editTitle") : t("modal.createTitle")}
        titleId="kiosk-machine-form-title"
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
                {t("modal.machineCode")} <span className="text-red-500">*</span>
              </span>
            }
            htmlFor="kiosk-machine-code"
          >
            <input
              id="kiosk-machine-code"
              value={machineCode}
              onChange={(e) => {
                setMachineCode(sanitizeTextInput(e.target.value));
                if (errors.machine_code) setErrors((prev) => ({ ...prev, machine_code: undefined }));
              }}
              className={cn(
                surfaceInputClassName,
                errors.machine_code && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              )}
              autoComplete="off"
              placeholder={t("modal.machineCodePlaceholder")}
            />
            {errors.machine_code ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.machine_code}</p>
            ) : null}
          </FieldGroup>

          <FieldGroup
            label={
              <span>
                {t("modal.machineName")} <span className="text-red-500">*</span>
              </span>
            }
            htmlFor="kiosk-machine-name"
          >
            <input
              id="kiosk-machine-name"
              value={machineName}
              onChange={(e) => {
                setMachineName(sanitizeTitleInput(e.target.value));
                if (errors.machine_name) setErrors((prev) => ({ ...prev, machine_name: undefined }));
              }}
              className={cn(
                surfaceInputClassName,
                errors.machine_name && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              )}
              autoComplete="off"
              placeholder={t("modal.machineNamePlaceholder")}
            />
            {errors.machine_name ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.machine_name}</p>
            ) : null}
          </FieldGroup>

          <FieldGroup label={t("modal.city")} htmlFor="kiosk-machine-city">
            <input
              id="kiosk-machine-city"
              value={city}
              onChange={(e) => setCity(sanitizeTextInput(e.target.value))}
              className={surfaceInputClassName}
              autoComplete="off"
            />
          </FieldGroup>

          <FieldGroup label={t("modal.locationName")} htmlFor="kiosk-machine-location">
            <input
              id="kiosk-machine-location"
              value={locationName}
              onChange={(e) => setLocationName(sanitizeTextInput(e.target.value))}
              className={surfaceInputClassName}
              autoComplete="off"
            />
          </FieldGroup>

          {editing ? (
            <FieldGroup label={t("modal.activeLabel")} htmlFor="kiosk-machine-active">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  id="kiosk-machine-active"
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
        highlight={deleteTarget?.machine_name}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
