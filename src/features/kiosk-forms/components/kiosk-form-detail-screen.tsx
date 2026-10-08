"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
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
  CheckmarkSelect,
  AppTabs,
  SurfaceShell,
  AppButton,
  type AppTabItem,
} from "@/shared/ui";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { DetailEntityLink } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { ExternalLink, Copy, Check, Share2, X } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import type { CustomerOrder, CustomerOrdersPagination } from "@/features/kiosk/api/kiosk.api";

function buildPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: Math.max(1, total) }, (_, i) => i + 1);
  }
  const set = new Set<number>();
  set.add(1);
  set.add(total);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) set.add(p);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

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

function formatCurrency(value?: string | number | null): string {
  if (value == null || value === "") return "£0.00";
  const num = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (Number.isNaN(num)) return `£${value}`;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GBP",
  }).format(num);
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ id?: string | string[] }>();
  const kioskId = Array.isArray(params.id) ? params.id[0] : params.id;

  const page = React.useMemo(() => {
    const raw = searchParams.get("page");
    const n = raw ? Number.parseInt(raw, 10) : 1;
    return Number.isFinite(n) && n >= 1 ? n : 1;
  }, [searchParams]);

  const pageSize = React.useMemo(() => {
    const raw = searchParams.get("page_size");
    const n = raw ? Number.parseInt(raw, 10) : 10;
    return Number.isFinite(n) && n > 0 ? n : 10;
  }, [searchParams]);

  const activeTab = searchParams.get("tab") || "orders";

  const [detail, setDetail] = React.useState<KioskConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [orders, setOrders] = React.useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = React.useState(true);
  const [ordersError, setOrdersError] = React.useState<string | null>(null);
  const [pagination, setPagination] = React.useState<CustomerOrdersPagination>({
    total_records: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 10,
  });
  const pageSizeOptions = React.useMemo(
    () => [
      { value: "10", label: "10" },
      { value: "20", label: "20" },
      { value: "50", label: "50" },
      { value: "100", label: "100" },
    ],
    [],
  );
  const pageRange = getListPageRange(pagination);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const shareRef = React.useRef<HTMLDivElement>(null);

  const handlePageChange = React.useCallback(
    (nextPage: number) => {
      const p = new URLSearchParams(searchParams.toString());
      if (nextPage <= 1) {
        p.delete("page");
      } else {
        p.set("page", String(nextPage));
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handlePageSizeChange = React.useCallback(
    (nextSize: number) => {
      const p = new URLSearchParams(searchParams.toString());
      if (nextSize === 10) {
        p.delete("page_size");
      } else {
        p.set("page_size", String(nextSize));
      }
      p.delete("page");
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleTabChange = React.useCallback(
    (nextTab: string) => {
      const p = new URLSearchParams(searchParams.toString());
      if (nextTab === "orders") {
        p.delete("tab");
      } else {
        p.set("tab", nextTab);
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

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
    setOrdersLoading(true);
    setOrdersError(null);
    void getCustomerOrders({
      kiosk_id: kioskId,
      page,
      page_size: pageSize,
    })
      .then((result) => {
        if (!cancelled) {
          setOrders(result.items);
          setPagination(result.pagination);
        }
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
  }, [kioskId, page, pageSize]);

  const tabs = React.useMemo<AppTabItem[]>(
    () => [{ id: "orders", label: "Submitted Orders" }],
    [],
  );

  return (
    <div className="bg-slate-50/50 dark:bg-slate-950">
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

      <div className="mx-auto w-full px-4 sm:px-6">
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
              <div className="space-y-2">
                <dl className="grid gap-4 border-y border-slate-200 p-5 sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-800">
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
                <div className="">
                <AppTabs
                  tabs={tabs}
                  value={activeTab}
                  onValueChange={handleTabChange}
                  ariaLabel="Kiosk form sections"
                  panelIdPrefix="kiosk-form-detail-tab"
                />
                </div>
                <section className="p-5">
                  <div className="overflow-hidden border border-slate-200 dark:border-slate-800">
                    <DataTableScroll>
                      <DataTable>
                        <DataTableHead>
                          <tr>
                            <DataTableTh>Order</DataTableTh>
                            <DataTableTh>Customer</DataTableTh>
                            <DataTableTh>Total</DataTableTh>
                            <DataTableTh>Status</DataTableTh>
                            <DataTableTh>Submitted</DataTableTh>
                          </tr>
                        </DataTableHead>
                        <DataTableBody>
                          {ordersLoading ? (
                            <DataTableEmptyRow colSpan={5} message="Loading submitted orders..." />
                          ) : ordersError ? (
                            <DataTableEmptyRow colSpan={5} message={ordersError} />
                          ) : orders.length === 0 ? (
                            <DataTableEmptyRow colSpan={5} message="Submitted orders will appear here." />
                          ) : (
                            orders.map((order) => {
                              const currentKioskId = kioskId || detail?.id;
                              const orderHref = `/kiosk-forms/${currentKioskId}/orders/${order.id}`;
                              return (
                                <DataTableRow
                                  key={order.id}
                                  clickable
                                  onClick={() => router.push(orderHref)}
                                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                >
                                  <DataTableTd className="font-semibold text-primary">
                                    <Link
                                      href={orderHref}
                                      onClick={(e) => e.stopPropagation()}
                                      className="hover:underline inline-flex items-center gap-1.5"
                                    >
                                      {order.order_number || `#${order.id}`}
                                    </Link>
                                  </DataTableTd>
                                  <DataTableTd className="text-slate-900 dark:text-slate-100">
                                    {order.customer?.full_name || "-"}
                                  </DataTableTd>
                                  <DataTableTd className="font-medium text-slate-900 dark:text-slate-100">
                                    {formatCurrency(order.total_amount ?? order.subtotal)}
                                  </DataTableTd>
                                  <DataTableTd>
                                    <span className={cn(
                                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                                      (order.order_status ?? "").toLowerCase().includes("paid") || (order.order_status ?? "").toLowerCase().includes("completed")
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                        : (order.order_status ?? "").toLowerCase().includes("cancel")
                                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                    )}>
                                      {formatOrderStatus(order.order_status)}
                                    </span>
                                  </DataTableTd>
                                  <DataTableTd className="text-slate-500 dark:text-slate-400">
                                    {formatDate(order.created_at ?? undefined)}
                                  </DataTableTd>
                                </DataTableRow>
                              );
                            })
                          )}
                        </DataTableBody>
                      </DataTable>
                    </DataTableScroll>
                    {!ordersLoading && !ordersError && orders.length > 0 && (
                      <div className="flex z-20 shrink-0 items-center border-t border-slate-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3 dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex w-full min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-2">
                          <p className="min-w-0 text-xs leading-normal text-slate-600 dark:text-slate-400">
                            Showing {pageRange.start} to {pageRange.end} of {pagination.total_records} orders
                          </p>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500 dark:text-slate-400">Rows per page:</span>
                              <CheckmarkSelect
                                listLabel="Rows per page"
                                buttonAriaLabel="Rows per page"
                                options={pageSizeOptions}
                                value={String(pageSize)}
                                disabled={ordersLoading}
                                portaled
                                size="sm"
                                showCheckmarks={false}
                                className="w-auto shrink-0"
                                onChange={(v) => {
                                  const parsed = Number.parseInt(v, 10);
                                  if (!Number.isNaN(parsed)) {
                                    handlePageSizeChange(parsed);
                                  }
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              className={cn(
                                "inline-flex h-8 min-h-8 min-w-8 items-center justify-center rounded-md border px-2.5 text-xs font-medium transition outline-none",
                                "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                                "disabled:pointer-events-none disabled:opacity-45",
                                "dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                                "focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-slate-600 dark:focus-visible:ring-offset-slate-950",
                              )}
                              disabled={pagination.current_page <= 1}
                              onClick={() => handlePageChange(Math.max(1, pagination.current_page - 1))}
                            >
                              Previous
                            </button>
                            <div className="flex items-center gap-0.5">
                              {buildPageList(pagination.current_page, pagination.total_pages).map((p, i) =>
                                p === "ellipsis" ? (
                                  <span
                                    key={`e-${i}`}
                                    className="inline-flex h-8 min-w-6 items-center justify-center px-0.5 text-xs text-slate-400"
                                    aria-hidden
                                  >
                                    …
                                  </span>
                                ) : (
                                  <button
                                    key={p}
                                    type="button"
                                    className={cn(
                                      "inline-flex h-8 min-h-8 min-w-8 items-center justify-center rounded-md border px-0 text-xs font-medium transition outline-none tabular-nums",
                                      p === pagination.current_page
                                        ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-900 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-100"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                                    )}
                                    aria-current={p === pagination.current_page ? "page" : undefined}
                                    onClick={() => handlePageChange(p)}
                                  >
                                    {p}
                                  </button>
                                ),
                              )}
                            </div>
                            <button
                              type="button"
                              className={cn(
                                "inline-flex h-8 min-h-8 min-w-8 items-center justify-center rounded-md border px-2.5 text-xs font-medium transition outline-none",
                                "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                                "disabled:pointer-events-none disabled:opacity-45",
                                "dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                                "focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-slate-600 dark:focus-visible:ring-offset-slate-950",
                              )}
                              disabled={pagination.current_page >= pagination.total_pages}
                              onClick={() => handlePageChange(pagination.current_page + 1)}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
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
