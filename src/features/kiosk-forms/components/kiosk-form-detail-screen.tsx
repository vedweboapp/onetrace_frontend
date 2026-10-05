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
import { ExternalLink, Copy, Check, Share2, X } from "lucide-react";

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
  const [shareOpen, setShareOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const shareRef = React.useRef<HTMLDivElement>(null);

  // Close share popover on outside click
  React.useEffect(() => {
    if (!shareOpen) return;
    function handleClick(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [shareOpen]);

  function getKioskUrl(): string {
    if (typeof window === "undefined" || !detail) return "";
    const orgUuid = getOrgUuid();
    const path = orgUuid
      ? `/public/kiosk/${detail.id}?token=${orgUuid}`
      : `/public/kiosk/${detail.id}`;
    return `${window.location.origin}${path}`;
  }

  function handleCopy() {
    const url = getKioskUrl();
    if (!url) return;
    const markCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    // Use Clipboard API if available (HTTPS), otherwise fall back to execCommand
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url).then(markCopied);
    } else {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        markCopied();
      } catch {
        // silent fail
      }
    }
  }

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
            <div className="relative" ref={shareRef}>
              <button
                type="button"
                onClick={() => setShareOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--dash-accent,#111111)] px-3 py-1.5 text-xs font-medium text-[color:var(--dash-on-accent,#ffffff)] shadow-sm hover:brightness-110"
              >
                <Share2 size={14} className="opacity-80" />
                Share
              </button>

              {shareOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  {/* Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Share Kiosk Form</p>
                    <button
                      type="button"
                      onClick={() => setShareOpen(false)}
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* URL display */}
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                    <span className="flex-1 truncate font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {getKioskUrl()}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      title={copied ? "Copied!" : "Copy URL"}
                      className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      {copied
                        ? <Check size={13} className="text-emerald-500" />
                        : <Copy size={13} className="text-slate-500" />}
                    </button>
                  </div>

                  {/* Copy + Open actions */}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                    <a
                      href={getKioskUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[color:var(--dash-accent,#111111)] px-3 py-2 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                    >
                      <ExternalLink size={13} />
                      Open Form
                    </a>
                  </div>
                </div>
              )}
            </div>
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
