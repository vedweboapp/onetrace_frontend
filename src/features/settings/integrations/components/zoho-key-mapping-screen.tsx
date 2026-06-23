"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ZOHO_DEFAULT_RESOURCE } from "@/features/settings/integrations/api/integration.paths";
import { fetchZohoKeyMapping, saveZohoKeyMapping } from "@/features/settings/integrations/api/integration.api";
import type { ZohoMappingRow } from "@/features/settings/integrations/types/integration.types";
import {
  existingMappingToRows,
  nextZohoMappingRowId,
  rowsToMappings,
  toSelectOptions,
} from "@/features/settings/integrations/utils/zoho-key-mapping.util";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, CheckmarkSelect, SurfaceShell } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
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

export type ZohoKeyMappingFormProps = {
  onSaveSuccess?: () => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
};

export function ZohoKeyMappingForm({
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
  const [externalOptions, setExternalOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [internalOptions, setInternalOptions] = React.useState<{ value: string; label: string }[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchZohoKeyMapping();
        if (cancelled) return;
        setExternalOptions(toSelectOptions(data.external_fields));
        setInternalOptions(toSelectOptions(data.internal_fields));
        setRows(existingMappingToRows(data.existing_mapping));
      } catch {
        if (!cancelled) setLoadError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  function updateRow(rowId: string, patch: Partial<Pick<ZohoMappingRow, "externalField" | "internalField">>) {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, { id: nextZohoMappingRowId(), externalField: "", internalField: "" }]);
  }

  function removeRow(rowId: string) {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== rowId);
      return next.length > 0 ? next : [{ id: nextZohoMappingRowId(), externalField: "", internalField: "" }];
    });
  }

  async function handleSave() {
    const mappings = rowsToMappings(rows);
    if (mappings.length === 0) {
      toastError(t("mappingRequired"));
      return;
    }

    setSaving(true);
    try {
      const result = await saveZohoKeyMapping({
        resource: ZOHO_DEFAULT_RESOURCE,
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
    } catch {
      toastError(t("saveError"));
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
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                  <th className="px-3 py-2">{t("externalField")}</th>
                  <th className="px-3 py-2">{t("internalField")}</th>
                  <th className="w-12 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 align-top">
                      <CheckmarkSelect
                        options={externalOptions}
                        value={row.externalField}
                        onChange={(value) => updateRow(row.id, { externalField: value })}
                        emptyLabel={t("selectExternal")}
                        listLabel={t("externalField")}
                        portaled
                        searchable
                        size="sm"
                        disabled={saving}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <CheckmarkSelect
                        options={internalOptions}
                        value={row.internalField}
                        onChange={(value) => updateRow(row.id, { internalField: value })}
                        emptyLabel={t("selectInternal")}
                        listLabel={t("internalField")}
                        portaled
                        searchable
                        size="sm"
                        disabled={saving}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <AppButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={saving}
                        aria-label={t("removeRow")}
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 className="size-4 text-red-600" aria-hidden />
                      </AppButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
        </>
      )}
    </>
  );
}

export function ZohoKeyMappingScreen() {
  const t = useTranslations("Dashboard.integrations.zohoKeyMapping");
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
        title={t("title")}
        subtitle={t("description")}
        backHref={safeBack}
        backAriaLabel={tConnection("backToDetails")}
      />

      <SurfaceShell className="rounded-xl">
        <div className="space-y-6 p-4 sm:p-6">
          <ZohoKeyMappingForm />
        </div>
      </SurfaceShell>
    </div>
  );
}
