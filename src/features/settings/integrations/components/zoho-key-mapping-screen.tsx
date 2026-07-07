"use client";

import * as React from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ZOHO_DEFAULT_RESOURCE, ZOHO_RESOURCES, type ZohoResource } from "@/features/settings/integrations/api/integration.paths";
import { fetchZohoKeyMapping, saveZohoKeyMapping } from "@/features/settings/integrations/api/integration.api";
import type { ZohoMappingRow, ZohoFieldSchema } from "@/features/settings/integrations/types/integration.types";
import {
  existingMappingToRows,
  nextZohoMappingRowId,
  rowsToMappings,
  toSelectOptions,
  sortInternalFields,
} from "@/features/settings/integrations/utils/zoho-key-mapping.util";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess, toastApiError, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { AppButton, CheckmarkSelect, SurfaceShell } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { DetailCollapsibleSection } from "@/shared/components/layout/detail-collapsible-section";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";



function HistoricalDataToggle({
  checked,
  disabled,
  label,
  hint,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  hint: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">

      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#111111)]/30",
          checked ? "bg-[color:var(--dash-accent,#111111)]" : "bg-slate-200 dark:bg-slate-700",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

const MAPPING_ROW_GRID =
  "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)_2.75rem] lg:items-start";

function MappingArrow() {
  return (
    <div className="flex items-center justify-center lg:justify-center">
      <span
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
        aria-hidden
      >
        <ArrowRight className="size-4" />
      </span>
    </div>
  );
}

function areTypesCompatible(typeA: string | undefined, typeB: string | undefined): boolean {
  if (!typeA || !typeB) return true;
  const normA = typeA.toLowerCase();
  const normB = typeB.toLowerCase();
  if (normA === normB) return true;
  if ((normA === "string" || normA === "text") && (normB === "string" || normB === "text")) {
    return true;
  }
  if ((normA === "number" || normA === "decimal") && (normB === "number" || normB === "decimal")) {
    return true;
  }
  return false;
}

export type ZohoKeyMappingFormProps = {
  resource?: ZohoResource;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
};

export function ZohoKeyMappingForm({
  resource = ZOHO_DEFAULT_RESOURCE,
  onSaveSuccess,
  onCancel,
  showCancelButton = true,
}: ZohoKeyMappingFormProps) {
  const t = useTranslations("Dashboard.integrations.zohoKeyMapping");
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [pullHistoricalData, setPullHistoricalData] = React.useState(true);
  const [rows, setRows] = React.useState<ZohoMappingRow[]>([]);
  const [externalFields, setExternalFields] = React.useState<ZohoFieldSchema[]>([]);
  const [internalFields, setInternalFields] = React.useState<ZohoFieldSchema[]>([]);
  const [externalOptions, setExternalOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [internalOptions, setInternalOptions] = React.useState<{ value: string; label: string }[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchZohoKeyMapping(resource);
        if (cancelled) return;
        const sortedInternalFields = sortInternalFields(data.internal_fields);
        setExternalFields(data.external_fields);
        setInternalFields(sortedInternalFields);
        setExternalOptions(toSelectOptions(data.external_fields));
        setInternalOptions(toSelectOptions(sortedInternalFields));
        setRows(existingMappingToRows(data.existing_mapping));
      } catch (error) {
        if (!cancelled) setLoadError(getApiErrorDisplayMessage(error, t("loadError")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resource, t]);

  function updateRow(rowId: string, patch: Partial<Pick<ZohoMappingRow, "externalField" | "internalField">>) {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, { id: nextZohoMappingRowId(), internalField: "", externalField: "" }]);
  }

  function removeRow(rowId: string) {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== rowId);
      return next.length > 0 ? next : [{ id: nextZohoMappingRowId(), externalField: "", internalField: "" }];
    });
  }

  async function handleSave() {
    const mappings = rowsToMappings(rows, internalOptions, externalOptions);
    if (mappings.length === 0) {
      toastError(t("mappingRequired"));
      return;
    }

    setSaving(true);
    try {
      const result = await saveZohoKeyMapping({
        resource,
        pull_historical_data: pullHistoricalData,
        mappings,
      });
      const syncedCount = result.data_synced?.length ?? 0;
      const message =
        syncedCount > 0
          ? t("savedWithSync", { count: syncedCount, message: result.message ?? t("saved") })
          : (result.message ?? t("saved"));
      toastSuccess(message);
      if (onSaveSuccess) {
        onSaveSuccess();
      } else {
        router.replace(routes.dashboard.settingsZohoConnection);
      }
    } catch (error) {
      toastApiError(error, t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    } else {
      router.replace(routes.dashboard.settingsZohoConnection);
    }
  }

  return (
    <>
      {loading ? (
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      ) : (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
            <div
              className={cn(
                "sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-4 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95",
                MAPPING_ROW_GRID,
              )}
            >
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("internalField")}</p>
              <span className="hidden lg:block" aria-hidden />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("externalField")}</p>
              <span className="hidden lg:block" aria-hidden />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row) => {
                const currentSimhoField = internalFields.find((f) => f.field === row.internalField);
                const currentSimhoType = currentSimhoField?.type;

                const currentZohoField = externalFields.find((f) => f.field === row.externalField);
                const currentZohoType = currentZohoField?.type;

                const filteredInternalOptions = internalOptions.filter((opt) => {
                  const isSelectedInOtherRow = rows.some((r) => r.id !== row.id && r.internalField === opt.value);
                  if (isSelectedInOtherRow) return false;

                  if (currentZohoType) {
                    const optField = internalFields.find((f) => f.field === opt.value);
                    if (optField && !areTypesCompatible(optField.type, currentZohoType)) {
                      return false;
                    }
                  }
                  return true;
                });

                const filteredExternalOptions = externalOptions.filter((opt) => {
                  const isSelectedInOtherRow = rows.some((r) => r.id !== row.id && r.externalField === opt.value);
                  if (isSelectedInOtherRow) return false;

                  if (currentSimhoType) {
                    const optField = externalFields.find((f) => f.field === opt.value);
                    if (optField && !areTypesCompatible(optField.type, currentSimhoType)) {
                      return false;
                    }
                  }
                  return true;
                });

                return (
                  <div key={row.id} className={cn("px-4 py-4", MAPPING_ROW_GRID, "lg:items-center")}>
                    <div className="min-w-0">
                      <CheckmarkSelect
                        className="w-full min-w-0"
                        options={filteredInternalOptions}
                        value={row.internalField}
                        onChange={(value) => updateRow(row.id, { internalField: value })}
                        emptyLabel={t("selectInternal")}
                        listLabel={t("internalField")}
                        portaled
                        searchable
                        size="sm"
                        disabled={saving}
                      />
                    </div>

                    <MappingArrow />

                    <div className="min-w-0">
                      <CheckmarkSelect
                        className="w-full min-w-0"
                        options={filteredExternalOptions}
                        value={row.externalField}
                        onChange={(value) => updateRow(row.id, { externalField: value })}
                        emptyLabel={t("selectExternal")}
                        listLabel={t("externalField")}
                        portaled
                        searchable
                        size="sm"
                        disabled={saving}
                      />
                    </div>

                    <div className="flex justify-end lg:justify-center">
                      <AppButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-9 shrink-0 p-0 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                        disabled={saving}
                        aria-label={t("removeRow")}
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </AppButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={addRow}>
            <Plus className="size-4" aria-hidden />
            {t("addRow")}
          </AppButton>

          <HistoricalDataToggle
            checked={pullHistoricalData}
            disabled={saving}
            label={t("pullHistoricalData")}
            hint={t("pullHistoricalDataHint")}
            onChange={setPullHistoricalData}
          />

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 sm:flex-row sm:justify-end">
            {showCancelButton && (
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={saving}
                onClick={handleCancel}
              >
                {t("cancel")}
              </AppButton>
            )}
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              loading={saving}
              onClick={() => void handleSave()}
            >
              {t("saveMapping")}
            </AppButton>
          </div>
        </div>
      )}
    </>
  );
}

export function ZohoKeyMappingScreen() {
  const tResources = useTranslations("Dashboard.integrations.zohoResources");
  const tConnection = useTranslations("Dashboard.integrations.zohoConnection");
  const searchParams = useSearchParams();
  const safeBack = React.useMemo(() => {
    const raw = searchParams.get("back");
    if (raw) {
      try {
        const decoded = decodeURIComponent(raw);
        if (
          decoded.startsWith("/") &&
          !decoded.startsWith("//") &&
          !decoded.includes("://") &&
          !decoded.includes("..") &&
          decoded.includes("/dashboard/")
        ) {
          return decoded;
        }
      } catch {
        // ignore malformed
      }
    }
    return routes.dashboard.settingsZohoConnection;
  }, [searchParams]);

  return (
    <div className="space-y-6 py-6">
      <DetailPageHeader
        title={tResources("mappingPageTitle")}
        subtitle={tResources("mappingPageDescription")}
        backHref={safeBack}
        backAriaLabel={tConnection("backToDetails")}
      />

      <SurfaceShell className="rounded-xl">
        <div className="space-y-4 p-4 sm:p-6">
          {ZOHO_RESOURCES.map((resource, index) => (
            <DetailCollapsibleSection
              key={resource}
              title={tResources(`${resource}.title`)}
              defaultOpen={index === 0}
              toggleAriaLabel={tResources(`${resource}.toggleSection`)}
              bodyClassName="space-y-4 pt-4"
            >
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tResources(`${resource}.mappingDescription`)}
              </p>
              <ZohoKeyMappingForm resource={resource} showCancelButton={false} />
            </DetailCollapsibleSection>
          ))}
        </div>
      </SurfaceShell>
    </div>
  );
}
