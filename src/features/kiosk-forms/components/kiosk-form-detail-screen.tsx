"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { getCustomerOrders, getKioskById } from "@/features/kiosk/api/kiosk.api";
import type { KioskConfig } from "@/features/kiosk/types/kiosk.types";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { entityDetailTabPanelClassName } from "@/shared/components/layout/detail-tab-layout";
import {
  DataTable,
  DataTableBody,
  DataTableEmptyRow,
  DataTableHead,
  DataTableRow,
  DataTableScroll,
  DataTableTd,
  DataTableTh,
  AppTabs,
  SurfaceShell,
  AppButton,
  type AppTabItem,
} from "@/shared/ui";
import { Link } from "@/i18n/navigation";
import { DetailEntityLink } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { ExternalLink } from "lucide-react";

function countQuestions(config: KioskConfig): number {
  return (config.questions ?? []).filter((question) => question.is_deleted !== true).length;
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatOrderStatus(value?: string | null): string {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getOrgUuid(): string | null {
  if (typeof window === "undefined") return null;
  // Try common localStorage keys for organization UUID
  const keys = ["organization_uuid", "org_uuid", "orgUuid", "organizationUuid"];
  for (const key of keys) {
    const val = localStorage.getItem(key);
    if (val) return val;
  }
  // Fallback: check inside auth-storage
  try {
    const auth = localStorage.getItem("auth-storage");
    if (auth) {
      const parsed = JSON.parse(auth);
      const orgs = parsed?.state?.organizations;
      if (Array.isArray(orgs) && orgs.length > 0) {
        return orgs[0]?.organization_uuid ?? orgs[0]?.uuid ?? null;
      }
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

export function KioskFormDetailScreen() {
  const params = useParams<{ id?: string | string[] }>();
  const kioskId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [detail, setDetail] = React.useState<KioskConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("orders");
  const [orders, setOrders] = React.useState<Awaited<ReturnType<typeof getCustomerOrders>>>([]);
  const [ordersLoading, setOrdersLoading] = React.useState(true);
  const [ordersError, setOrdersError] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    let cancelled = false;
    void getCustomerOrders()
      .then((result) => {
        if (!cancelled) setOrders(result);
      })
      .catch(() => {
        if (!cancelled) setOrdersError("Submitted orders could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
        actions={
          detail ? (
            <button
              type="button"
              onClick={() => {
                const orgUuid = getOrgUuid();
                const url = orgUuid
                  ? `/public/kiosk/${detail.id}?token=${orgUuid}`
                  : `/public/kiosk/${detail.id}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--dash-accent,#111111)] px-3 py-1.5 text-xs font-medium text-[color:var(--dash-on-accent,#ffffff)] shadow-sm hover:brightness-110"
            >
              Open
              <ExternalLink size={14} className="opacity-70" />
            </button>
          ) : undefined
        }
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
                <dl className="grid gap-4 border-y border-slate-200 py-5 sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-800">
                  {/* Title — hyperlink to the kiosk editor */}
                  <div className="lg:col-span-1">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</dt>
                    <dd className="mt-1 text-sm">
                      <DetailEntityLink
                        href={`${routes.dashboard.settingsKiosks}/${detail.id}?kiosk_mode=edit`}
                        className="font-semibold break-words"
                      >
                        {detail.name || "—"}
                      </DetailEntityLink>
                    </dd>
                  </div>
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
                          {ordersLoading ? (
                            <DataTableEmptyRow colSpan={4} message="Loading submitted orders..." />
                          ) : ordersError ? (
                            <DataTableEmptyRow colSpan={4} message={ordersError} />
                          ) : orders.length === 0 ? (
                            <DataTableEmptyRow colSpan={4} message="Submitted orders will appear here." />
                          ) : (
                            orders.map((order) => (
                              <DataTableRow key={order.id}>
                                <DataTableTd className="font-medium text-slate-900 dark:text-slate-100">
                                  {order.order_number || `#${order.id}`}
                                </DataTableTd>
                                <DataTableTd>
                                  {order.customer?.full_name || "-"}
                                </DataTableTd>
                                <DataTableTd>
                                  {formatOrderStatus(order.order_status)}
                                </DataTableTd>
                                <DataTableTd>{formatDate(order.created_at ?? undefined)}</DataTableTd>
                              </DataTableRow>
                            ))
                          )}
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
