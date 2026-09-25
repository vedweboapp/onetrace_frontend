"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { getKioskById } from "@/features/kiosk/api/kiosk.api";
import type { KioskConfig } from "@/features/kiosk/types/kiosk.types";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { entityDetailTabPanelClassName } from "@/shared/components/layout/detail-tab-layout";
import {
  DataTable,
  DataTableBody,
  DataTableEmptyRow,
  DataTableHead,
  DataTableScroll,
  DataTableTh,
  AppTabs,
  SurfaceShell,
  type AppTabItem,
} from "@/shared/ui";
import { Link } from "@/i18n/navigation";

function countQuestions(config: KioskConfig): number {
  return (config.questions ?? []).filter((question) => question.is_deleted !== true).length;
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function KioskFormDetailScreen() {
  const params = useParams<{ id?: string | string[] }>();
  const kioskId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [detail, setDetail] = React.useState<KioskConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("orders");

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!kioskId) {
        setError("Kiosk form was not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const result = await getKioskById(kioskId);
      if (cancelled) return;
      if (!result) {
        setError("Kiosk form could not be loaded.");
      } else {
        setDetail(result);
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [kioskId]);

  const tabs = React.useMemo<AppTabItem[]>(
    () => [{ id: "orders", label: "Submitted Orders" }],
    [],
  );

  return (
    <div className="min-h-full bg-slate-50/50 pb-8 dark:bg-slate-950">
      <DetailPageHeader
        title={detail?.name || "Kiosk Form"}
        backHref="/kiosk-forms"
        backAriaLabel="Back to kiosk forms"
        subtitle={detail?.api_name ? <span>{detail.api_name}</span> : undefined}
      />

      <div className="mx-auto w-full max-w-350 px-4 pt-4 sm:px-6">
        <SurfaceShell className="rounded-none! border-0! shadow-none! ring-0!">
          <div
            role="tabpanel"
            id={`kiosk-form-detail-tab-${activeTab}`}
            aria-labelledby={`kiosk-form-detail-tab-trigger-${activeTab}`}
            className={entityDetailTabPanelClassName}
          >
            {loading ? (
              <div className="space-y-3 p-6">
                <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <Link href="/kiosk-forms" className="mt-3 inline-block text-sm text-teal-700 underline">
                  Back to kiosk forms
                </Link>
              </div>
            ) : detail ? (
              <div className="space-y-6">
                <dl className="grid gap-4 border-y border-slate-200 py-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">API Name</dt>
                    <dd className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">{detail.api_name || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
                    <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100">{detail.is_active === false ? "Inactive" : "Active"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questions</dt>
                    <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100">{countQuestions(detail)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</dt>
                    <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100">{formatDate(detail.created_at)}</dd>
                  </div>
                </dl>

                <AppTabs
                  tabs={tabs}
                  value={activeTab}
                  onValueChange={setActiveTab}
                  ariaLabel="Kiosk form sections"
                  panelIdPrefix="kiosk-form-detail-tab"
                />

                <section>
                  <div className="overflow-hidden border border-slate-200 dark:border-slate-800">
                    <DataTableScroll>
                      <DataTable>
                        <DataTableHead>
                          <tr>
                            <DataTableTh>Order</DataTableTh>
                            <DataTableTh>Customer</DataTableTh>
                            <DataTableTh>Status</DataTableTh>
                            <DataTableTh>Submitted</DataTableTh>
                          </tr>
                        </DataTableHead>
                        <DataTableBody>
                          <DataTableEmptyRow
                            colSpan={4}
                            message="Submitted orders will appear here."
                          />
                        </DataTableBody>
                      </DataTable>
                    </DataTableScroll>
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </SurfaceShell>
      </div>
    </div>
  );
}

export default KioskFormDetailScreen;
