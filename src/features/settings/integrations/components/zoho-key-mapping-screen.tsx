"use client";

import * as React from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  ZOHO_DEFAULT_RESOURCE,
  ZOHO_RESOURCES,
  type ZohoResource,
} from "@/features/settings/integrations/api/integration.paths";
import {
  fetchZohoKeyMapping,
  pullZohoHistoricalRecords,
  saveZohoKeyMapping,
} from "@/features/settings/integrations/api/integration.api";
import type {
  ZohoFieldGroup,
  ZohoMappingRow,
} from "@/features/settings/integrations/types/integration.types";
import {
  buildGroupedMappingRows,
  findFieldInGroups,
  groupFieldsToSelectOptions,
  nextZohoMappingRowId,
  rowsToMappings,
  sortFieldsInGroup,
} from "@/features/settings/integrations/utils/zoho-key-mapping.util";
import { routes } from "@/shared/config/routes";
import {
  toastError,
  toastSuccess,
  toastApiError,
  getApiErrorDisplayMessage,
} from "@/shared/feedback/app-toast";
import { AppButton, CheckmarkSelect, SurfaceShell } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { DetailCollapsibleSection } from "@/shared/components/layout/detail-collapsible-section";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";

const MAPPING_ROW_GRID =
  "grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)_2.5rem] lg:items-center";

function MappingArrow() {
  return (
    <div className="flex items-center justify-center">
      <span
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
        aria-hidden
      >
        <ArrowRight className="size-3.5" />
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

function inferZohoGroupByInternal(
  internalGroups: ZohoFieldGroup[],
  externalGroups: ZohoFieldGroup[],
  mappingRows: ZohoMappingRow[],
): Record<string, string> {
  const next: Record<string, string> = {};
  const defaultZoho = externalGroups[0]?.group ?? "";
  for (const group of internalGroups) {
    const fromRows = mappingRows.find(
      (r) => r.internalGroup === group.group && r.externalGroup.trim(),
    )?.externalGroup;
    next[group.group] = fromRows?.trim() || defaultZoho;
  }
  return next;
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
  const [pullingHistoricalData, setPullingHistoricalData] = React.useState(false);
  const [rows, setRows] = React.useState<ZohoMappingRow[]>([]);
  const [externalGroups, setExternalGroups] = React.useState<ZohoFieldGroup[]>([]);
  const [internalGroups, setInternalGroups] = React.useState<ZohoFieldGroup[]>([]);
  /** Zoho group selected once per SimHo section. */
  const [zohoGroupByInternal, setZohoGroupByInternal] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchZohoKeyMapping(resource);
        if (cancelled) return;
        const nextInternal = data.internal_fields;
        const nextExternal = data.external_fields;
        const nextRows = buildGroupedMappingRows(nextInternal, data.existing_mapping);
        const zohoByInternal = inferZohoGroupByInternal(nextInternal, nextExternal, nextRows);
        setInternalGroups(nextInternal);
        setExternalGroups(nextExternal);
        setZohoGroupByInternal(zohoByInternal);
        setRows(
          nextRows.map((row) => ({
            ...row,
            externalGroup: row.externalGroup.trim() || zohoByInternal[row.internalGroup] || "",
          })),
        );
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

  const externalGroupOptions = React.useMemo(
    () => externalGroups.map((g) => ({ value: g.group, label: g.label || g.group })),
    [externalGroups],
  );

  function updateRow(
    rowId: string,
    patch: Partial<Pick<ZohoMappingRow, "externalField" | "externalGroup" | "internalField">>,
  ) {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function setSectionZohoGroup(internalGroup: string, zohoGroup: string) {
    setZohoGroupByInternal((prev) => ({ ...prev, [internalGroup]: zohoGroup }));
    setRows((prev) =>
      prev.map((row) =>
        row.internalGroup === internalGroup
          ? { ...row, externalGroup: zohoGroup, externalField: "" }
          : row,
      ),
    );
  }

  function addRow(internalGroup: string) {
    const zohoGroup = zohoGroupByInternal[internalGroup] ?? externalGroups[0]?.group ?? "";
    setRows((prev) => [
      ...prev,
      {
        id: nextZohoMappingRowId(),
        internalGroup,
        internalField: "",
        externalGroup: zohoGroup,
        externalField: "",
      },
    ]);
  }

  function removeRow(rowId: string) {
    setRows((prev) => {
      const target = prev.find((r) => r.id === rowId);
      if (target?.required) return prev;
      return prev.filter((row) => row.id !== rowId);
    });
  }

  async function handleSave() {
    const mappings = rowsToMappings(rows, internalGroups, externalGroups);
    if (mappings.length === 0) {
      toastError(t("mappingRequired"));
      return;
    }

    setSaving(true);
    try {
      const result = await saveZohoKeyMapping({
        resource,
        mappings,
      });
      toastSuccess(result.message ?? t("saved"));
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

  async function handlePullHistoricalData() {
    setPullingHistoricalData(true);
    try {
      const result = await pullZohoHistoricalRecords(resource);
      toastSuccess(result.message ?? t("pullHistoricalDataSuccess"));
    } catch (error) {
      toastApiError(error, t("pullHistoricalDataError"));
    } finally {
      setPullingHistoricalData(false);
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
          <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
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
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("columnOnetrace")}
              </p>
              <span className="hidden lg:block" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("columnZoho")}
              </p>
              <span className="hidden lg:block" aria-hidden />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {internalGroups.map((group) => {
                const groupRows = rows.filter((r) => r.internalGroup === group.group);
                const zohoGroupKey = zohoGroupByInternal[group.group] ?? "";
                const selectedZohoGroup = externalGroups.find((g) => g.group === zohoGroupKey);
                const unusedInternalOptions = groupFieldsToSelectOptions([group]).filter(
                  (opt) => !groupRows.some((r) => r.internalField === opt.value),
                );

                return (
                  <section key={group.group} className="bg-white dark:bg-slate-950">
                    {/* Group selected once at top — not repeated per field */}
                    <div className={cn("border-b border-slate-100 px-4 py-3 dark:border-slate-800", MAPPING_ROW_GRID)}>
                      <div className="flex min-h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100">
                        {group.label}
                      </div>
                      <MappingArrow />
                      <CheckmarkSelect
                        className="w-full min-w-0"
                        options={externalGroupOptions}
                        value={zohoGroupKey}
                        onChange={(value) => setSectionZohoGroup(group.group, value)}
                        emptyLabel={t("selectExternalGroup")}
                        listLabel={t("selectExternalGroup")}
                        portaled
                        searchable
                        size="sm"
                        disabled={saving || externalGroups.length === 0}
                      />
                      <span className="hidden lg:block" aria-hidden />
                    </div>

                    {groupRows.map((row) => {
                      const currentSimho = findFieldInGroups(
                        internalGroups,
                        row.internalField,
                        row.internalGroup,
                      );
                      const currentSimhoType = currentSimho?.field.type;
                      const zohoFieldOptions = sortFieldsInGroup(selectedZohoGroup?.fields ?? [])
                        .filter((f) => {
                          const usedElsewhere = rows.some(
                            (r) =>
                              r.id !== row.id &&
                              r.externalGroup === zohoGroupKey &&
                              r.externalField === f.field,
                          );
                          if (usedElsewhere) return false;
                          if (currentSimhoType && !areTypesCompatible(f.type, currentSimhoType)) {
                            return false;
                          }
                          return true;
                        })
                        .map((f) => ({ value: f.field, label: f.label || f.field }));

                      const rowInternalOptions = groupFieldsToSelectOptions([group]).filter(
                        (opt) => {
                          const usedElsewhere = rows.some(
                            (r) =>
                              r.id !== row.id &&
                              r.internalGroup === group.group &&
                              r.internalField === opt.value,
                          );
                          return !usedElsewhere;
                        },
                      );

                      return (
                        <div key={row.id} className={cn("px-4 py-3", MAPPING_ROW_GRID)}>
                          <div className="min-w-0">
                            {row.required && row.internalField ? (
                              <div className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100">
                                <span className="min-w-0 truncate">
                                  {currentSimho?.field.label || row.internalField}
                                </span>
                                <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                  {t("requiredBadge")}
                                </span>
                              </div>
                            ) : (
                              <CheckmarkSelect
                                className="w-full min-w-0"
                                options={rowInternalOptions}
                                value={row.internalField}
                                onChange={(value) => updateRow(row.id, { internalField: value })}
                                emptyLabel={t("selectInternal")}
                                listLabel={t("columnOnetrace")}
                                portaled
                                searchable
                                size="sm"
                                disabled={saving}
                              />
                            )}
                          </div>

                          <MappingArrow />

                          <div className="min-w-0">
                            <CheckmarkSelect
                              className="w-full min-w-0"
                              options={zohoFieldOptions}
                              value={row.externalField}
                              onChange={(value) =>
                                updateRow(row.id, {
                                  externalField: value,
                                  externalGroup: zohoGroupKey,
                                })
                              }
                              emptyLabel={
                                zohoGroupKey ? t("selectExternal") : t("selectExternalGroupFirst")
                              }
                              listLabel={t("columnZoho")}
                              portaled
                              searchable
                              size="sm"
                              disabled={saving || !zohoGroupKey}
                            />
                          </div>

                          <div className="flex justify-end lg:justify-center">
                            {!row.required ? (
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
                            ) : (
                              <span className="hidden size-9 lg:block" aria-hidden />
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex justify-start px-4 py-3">
                      <AppButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={
                          saving ||
                          !zohoGroupKey ||
                          group.fields.length === 0 ||
                          unusedInternalOptions.length === 0
                        }
                        onClick={() => addRow(group.group)}
                      >
                        <Plus className="size-4" aria-hidden />
                        {t("addRow")}
                      </AppButton>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 sm:flex-row sm:justify-end">
            {showCancelButton && (
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={saving || pullingHistoricalData}
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
              disabled={pullingHistoricalData}
              onClick={() => void handleSave()}
            >
              {t("saveMapping")}
            </AppButton>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t("pullHistoricalData")}
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {t("pullHistoricalDataDescription")}
                </p>
              </div>
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                loading={pullingHistoricalData}
                disabled={saving}
                onClick={() => void handlePullHistoricalData()}
              >
                {t("pullHistoricalDataAction")}
              </AppButton>
            </div>
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
