"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/navigation";
import { User, MapPin, Receipt, Image as ImageIcon, Calendar, CreditCard, Copy, Check, Eye } from "lucide-react";
import { getCustomerOrderById, getKioskById } from "@/features/kiosk/api/kiosk.api";
import type { CustomerOrderDetail, KioskConfig, KioskQuestion } from "@/features/kiosk/types/kiosk.types";
import { fetchGroup } from "@/features/groups/api/group.api";
import type { GroupItemRef } from "@/features/groups/types/group.types";
import { AppButton, SurfaceShell } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function formatOrderStatus(value?: string | null): string {
  if (!value) return "Pending";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusBadgeStyle(status?: string | null): { badge: string; dot: string } {
  const normalized = (status ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.includes("paid") || normalized.includes("completed") || normalized.includes("success")) {
    return {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      dot: "bg-emerald-500",
    };
  }
  if (normalized.includes("cancel") || normalized.includes("failed") || normalized.includes("reject")) {
    return {
      badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      dot: "bg-rose-500",
    };
  }
  return {
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    dot: "bg-amber-500",
  };
}

export function KioskOrderDetailScreen() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[]; orderId?: string | string[] }>();
  const kioskId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const rawOrderId = Array.isArray(params?.orderId)
    ? params.orderId[0]
    : (params?.orderId ?? (params?.id && !params?.orderId ? params.id : undefined));
  const orderId = typeof rawOrderId === "string" ? rawOrderId : Array.isArray(rawOrderId) ? rawOrderId[0] : undefined;

  const [order, setOrder] = React.useState<CustomerOrderDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  // Kiosk config to resolve question labels by q_id
  const [kioskConfig, setKioskConfig] = React.useState<KioskConfig | null>(null);
  // Map: item_group_id → group items (for lookup questions)
  const [lookupGroupItems, setLookupGroupItems] = React.useState<Record<string, GroupItemRef[]>>({});

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!orderId) {
        setError("Order identifier was not found in the URL.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getCustomerOrderById(orderId);
        if (!cancelled) {
          if (!data) {
            setError("Order details could not be found.");
          } else {
            setOrder(data);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Failed to load order details:", err);
          setError(err?.response?.data?.message || err?.message || "Failed to load order details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const effectiveKioskId =
    kioskId ||
    (typeof order?.kiosk === "object" ? order?.kiosk?.id : order?.kiosk) ||
    (order as any)?.kiosk_id ||
    (typeof order?.service_form === "object" ? order?.service_form?.id : order?.service_form) ||
    (order as any)?.service_form_id;

  // Load kiosk config once orderId resolves, to get question labels + detect lookup questions
  React.useEffect(() => {
    if (!effectiveKioskId) return;
    let cancelled = false;
    void getKioskById(String(effectiveKioskId)).then((cfg) => {
      if (cancelled || !cfg) return;
      setKioskConfig(cfg);
      // For every lookup question that has an item_group_id, prefetch the group items
      const lookupQuestions = (cfg.questions ?? []).filter(
        (q: KioskQuestion) => (q.is_lookup || q.item_group_id != null) && q.item_group_id != null,
      );
      if (lookupQuestions.length === 0) return;
      void Promise.allSettled(
        lookupQuestions.map(async (q: KioskQuestion) => {
          const gid = Number(q.item_group_id);
          if (!gid) return;
          try {
            const group = await fetchGroup(gid);
            if (!cancelled && group?.items) {
              setLookupGroupItems((prev) => ({
                ...prev,
                [String(q.item_group_id)]: group.items as GroupItemRef[],
              }));
            }
          } catch {
            // silent – labels simply fall back to raw value
          }
        }),
      );
    });
    return () => { cancelled = true; };
  }, [effectiveKioskId]);

  // Build a quick lookup: q_id (string) → KioskQuestion
  const questionByQId = React.useMemo<Record<string, KioskQuestion>>(() => {
    if (!kioskConfig) return {};
    const map: Record<string, KioskQuestion> = {};
    for (const q of kioskConfig.questions ?? []) {
      if (q.q_id != null) map[String(q.q_id)] = q;
      if (q.id != null) map[String(q.id)] = q;
    }
    return map;
  }, [kioskConfig]);

  const handleCopyOrderNumber = () => {
    const text = order?.order_number || `#${orderId}`;
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const snapshotUrl =
    order?.snapshot_image ||
    order?.snapshot_image_url ||
    order?.items?.find((item) => item.snapshot_image_url)?.snapshot_image_url ||
    null;

  const backUrl = kioskId ? `/kiosk-forms/${kioskId}` : "/kiosk-forms";
  const statusStyles = getStatusBadgeStyle(order?.order_status);

  return (
    <div className="bg-slate-50/60 dark:bg-slate-950">
      <DetailPageHeader
        title={
          loading ? (
            `Order #${orderId ?? ""}`
          ) : (
            <span className="flex items-center gap-2">
              Order {order?.order_number || `#${orderId}`}
              {order && (
                <button
                  type="button"
                  onClick={handleCopyOrderNumber}
                  title="Copy order number"
                  className="inline-flex size-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                </button>
              )}
              {order && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    statusStyles.badge
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", statusStyles.dot)} />
                  {formatOrderStatus(order.order_status)}
                </span>
              )}
            </span>
          )
        }
        titleLoading={loading}
        backHref={backUrl}
        backAriaLabel="Back to kiosk form orders"
        subtitle={
          order ? (
            <span>Submitted on {formatDate(order.created_at)}</span>
          ) : undefined
        }
        actions={
          snapshotUrl ? (
            <AppButton
              variant="secondaryLight"
              size="sm"
              onClick={() => setImageModalOpen(true)}
              className="gap-1.5 font-medium"
            >
              <Eye className="size-4" />
              View Snapshot
            </AppButton>
          ) : undefined
        }
      />

      {/* Main Content Area */}
      <div className="lg:p-4 p-2 bg-white border-slate-200 border shadow-sm dark:bg-slate-900 dark:border-slate-800">
        {loading ? (
          <div className="w-full space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800" />
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className="h-64 animate-pulse rounded-xl bg-white shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800" />
                <div className="h-80 animate-pulse rounded-xl bg-white shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800" />
              </div>
              <div className="space-y-6">
                <div className="h-64 animate-pulse rounded-xl bg-white shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="mx-auto max-w-2xl py-12 text-center">
            <SurfaceShell className="rounded-xl border border-red-200 bg-red-50/50 p-8 dark:border-red-900/50 dark:bg-red-950/20">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">Failed to load order</h2>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
              <div className="mt-6 flex justify-center gap-3">
                <AppButton onClick={() => router.push(backUrl)} variant="secondaryLight">
                  Return to Form
                </AppButton>
                <AppButton onClick={() => window.location.reload()}>Retry</AppButton>
              </div>
            </SurfaceShell>
          </div>
        ) : order ? (
          <div className="w-full space-y-6">
            {/* Top Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SurfaceShell className="flex items-center gap-4 rounded-sm border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <Receipt className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Order Number</p>
                  <p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                    {order.order_number || `#${order.id}`}
                  </p>
                </div>
              </SurfaceShell>

              <SurfaceShell className="flex items-center gap-4 rounded-sm border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                  <User className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Customer</p>
                  <p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                    {order.customer?.full_name || "—"}
                  </p>
                </div>
              </SurfaceShell>

              <SurfaceShell className="flex items-center gap-4 rounded-sm border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <CreditCard className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Amount</p>
                  <p className="truncate text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(order.total_amount ?? order.subtotal)}
                  </p>
                </div>
              </SurfaceShell>

              <SurfaceShell className="flex items-center gap-4 rounded-sm border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                  <Calendar className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Created At</p>
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {formatDate(order.created_at)}
                  </p>
                </div>
              </SurfaceShell>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left 2 Cols: Customer, Billing, and Configured Items */}
              <div className="space-y-6 lg:col-span-2">
                {/* Customer & Billing Card */}
                <SurfaceShell className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-200/80 px-5 py-3.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <User className="size-4 text-slate-500" />
                      Customer & Billing Details
                    </h2>
                  </div>
                  <div className="grid gap-6 p-5 sm:grid-cols-2">
                    {/* Customer Info */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Contact Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Full Name</span>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {order.customer?.full_name || "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Email</span>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {order.customer?.email || order.customer_email ? (
                              <a
                                href={`mailto:${order.customer?.email || order.customer_email}`}
                                className="text-primary hover:underline"
                              >
                                {order.customer?.email || order.customer_email}
                              </a>
                            ) : (
                              "—"
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Phone</span>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {order.customer?.phone || order.customer_phone ? (
                              <a
                                href={`tel:${order.customer?.phone || order.customer_phone}`}
                                className="text-primary hover:underline"
                              >
                                {order.customer?.phone || order.customer_phone}
                              </a>
                            ) : (
                              "—"
                            )}
                          </p>
                        </div>
                        {order.customer?.company_name && (
                          <div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Company</span>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {order.customer.company_name}
                            </p>
                          </div>
                        )}
                        {order.customer?.vat_registered && (
                          <div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">VAT Number</span>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {order.customer.vat_number || "VAT Registered"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Billing Address */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        Billing Address
                      </h3>
                      {order.billing_address ? (
                        <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {order.billing_address.address_line1 || order.billing_address.address_line_1 || "—"}
                          </p>
                          {(order.billing_address.address_line2 || order.billing_address.address_line_2) && (
                            <p>{order.billing_address.address_line2 || order.billing_address.address_line_2}</p>
                          )}
                          <p>
                            {[order.billing_address.city, order.billing_address.postcode].filter(Boolean).join(", ")}
                          </p>
                          {order.billing_address.country && <p>{order.billing_address.country}</p>}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No billing address provided.</p>
                      )}
                    </div>
                  </div>
                </SurfaceShell>

                {/* Configured Form Items Breakdown */}
                <SurfaceShell className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-200/80 px-5 py-3.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Receipt className="size-4 text-slate-500" />
                      Submitted Items & Configurations
                    </h2>
                    {Array.isArray(order.items) && (
                      <span className="text-xs text-slate-500">
                        {order.items.length} {order.items.length === 1 ? "Item" : "Items"}
                      </span>
                    )}
                  </div>

                  {!Array.isArray(order.items) || order.items.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      No configured items available for this order.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {order.items.map((item: any, idx: number) => {
                        const itemName = item.item_name || item.question_title || item.title || `Item #${idx + 1}`;
                        const itemQty = item.quantity ?? 1;
                        const itemUnitPrice = item.unit_price;
                        const itemTotalPrice = item.total_price;
                        const itemSnapshot = item.snapshot_image_url;

                        // -------------------------------------------------------
                        // Resolve configurations from the actual API payload shape:
                        //   item.items = [{ q_id, values: [{ o_id, value, price }] }]
                        // Fall back to legacy shapes for backward compat.
                        // -------------------------------------------------------
                        type ResolvedValue = {
                          subLabel?: string | null;
                          displayValue: string;
                          rawValue: string;
                          price?: number | string | null;
                        };

                        type ResolvedConfig = {
                          key: string;
                          questionLabel: string;
                          hasGroup: boolean;
                          groupTitle?: string | null;
                          values: ResolvedValue[];
                          totalPrice: number;
                        };

                        const resolvedConfigs: ResolvedConfig[] = [];

                        const nestedItems = Array.isArray(item.items) ? item.items : [];

                        if (nestedItems.length > 0) {
                          // New API shape: item.items = [{ q_id, values: [{o_id, value, price}] }]
                          // Group nested items by question ID so that each question is processed exactly once
                          type RawQuestionAcc = {
                            qId: string;
                            rawValues: Array<{
                              o_id?: number | string;
                              id?: number | string;
                              value?: string | number | null;
                              label?: string | null;
                              title?: string | null;
                              price?: number | string | null;
                            }>;
                          };

                          const questionMap = new Map<string, RawQuestionAcc>();

                          for (let qiIdx = 0; qiIdx < nestedItems.length; qiIdx++) {
                            const qi = nestedItems[qiIdx];
                            const qId = String(qi.q_id ?? qi.id ?? `qi_${qiIdx}`);
                            let acc = questionMap.get(qId);
                            if (!acc) {
                              acc = { qId, rawValues: [] };
                              questionMap.set(qId, acc);
                            }
                            const vals = Array.isArray(qi.values)
                              ? qi.values
                              : qi.value != null
                                ? [{ o_id: qi.o_id, id: qi.id, value: qi.value, label: qi.label, price: qi.price }]
                                : [];
                            for (const v of vals) {
                              acc.rawValues.push(v);
                            }
                          }

                          for (const [qId, acc] of questionMap.entries()) {
                            const question = questionByQId[qId];
                            const questionLabel = question?.label || `Question ${qId}`;
                            const isLookup = Boolean(question?.is_lookup || question?.item_group_id != null);
                            const groupId = question?.item_group_id ? String(question.item_group_id) : null;
                            const groupItems = groupId ? (lookupGroupItems[groupId] ?? []) : [];

                            // Check whether question has a group
                            const groups =
                              question?.groups && question.groups.length > 0
                                ? question.groups
                                : (question as any)?.group
                                  ? [(question as any).group]
                                  : [];
                            const hasGroup = !isLookup && groups.length > 0;
                            const groupTitle = hasGroup
                              ? groups[0]?.name || (groups[0] as any)?.title || null
                              : null;

                            const groupOptions = hasGroup
                              ? groups.flatMap((g: any) => g.options ?? [])
                              : [];

                            const resolvedValues: ResolvedValue[] = [];
                            let sumPrice = 0;

                            for (let vIdx = 0; vIdx < acc.rawValues.length; vIdx++) {
                              const v = acc.rawValues[vIdx];
                              const rawValue = String(v.value ?? v.label ?? "—");
                              let displayValue = rawValue;
                              let subLabel: string | null = null;
                              const vPrice = v.price != null && Number(v.price) > 0 ? Number(v.price) : 0;
                              sumPrice += vPrice;

                              if (isLookup && groupItems.length > 0) {
                                // Match by item id (the value field stores the item id for lookup)
                                const matchedItem = groupItems.find(
                                  (gi) => String(gi.item) === rawValue || String(gi.id) === rawValue,
                                );
                                if (matchedItem) {
                                  displayValue = matchedItem.item_name || matchedItem.abbreviation || rawValue;
                                }
                              } else if (hasGroup) {
                                const oId = String(v.o_id ?? v.id ?? "");
                                const matchedOpt =
                                  groupOptions.find(
                                    (o: any) =>
                                      (o.o_id != null && String(o.o_id) === oId) ||
                                      (o.id != null && String(o.id) === oId),
                                  ) || groupOptions[vIdx];
                                if (matchedOpt?.label || (matchedOpt as any)?.title || (matchedOpt as any)?.name) {
                                  subLabel =
                                    matchedOpt.label || (matchedOpt as any)?.title || (matchedOpt as any)?.name;
                                }
                              } else if (question && !isLookup) {
                                // For regular questions, try to match option label by o_id or value
                                const allOptions = [
                                  ...(question.options ?? []),
                                  ...(question.groups ?? []).flatMap((g: any) => g.options ?? []),
                                ];
                                const oId = String(v.o_id ?? v.id ?? "");
                                const matchedOpt =
                                  allOptions.find((o) => String(o.id) === oId || String(o.o_id) === oId) ||
                                  allOptions.find((o) => String(o.value) === rawValue);
                                if (matchedOpt?.label) displayValue = matchedOpt.label;
                              }

                              resolvedValues.push({
                                subLabel,
                                displayValue,
                                rawValue,
                                price: v.price ?? null,
                              });
                            }

                            resolvedConfigs.push({
                              key: qId,
                              questionLabel,
                              hasGroup,
                              groupTitle,
                              values: resolvedValues,
                              totalPrice: sumPrice,
                            });
                          }
                        } else {
                          // Legacy fallback: group by question
                          const legacyList = Array.isArray(item.configurations)
                            ? item.configurations
                            : Array.isArray(item.values)
                              ? item.values
                              : Array.isArray(item.options)
                                ? item.options
                                : item.value != null
                                  ? [{ question_label: item.question_title || "Question", option_value: item.value, option_price: item.price }]
                                  : [];
                          for (let li = 0; li < legacyList.length; li++) {
                            const cfg = legacyList[li];
                            const qLabel = cfg.question_label || cfg.question_title || cfg.label || `Option #${li + 1}`;
                            const dVal = String(cfg.option_label || cfg.option_value || cfg.value || cfg.name || "—");
                            const rVal = String(cfg.option_value || cfg.value || "");
                            const p = cfg.option_price ?? cfg.price ?? null;
                            const pNum = p != null && Number(p) > 0 ? Number(p) : 0;

                            const existing = resolvedConfigs.find((r) => r.questionLabel === qLabel);
                            if (existing) {
                              existing.values.push({
                                displayValue: dVal,
                                rawValue: rVal,
                                price: p,
                              });
                              existing.totalPrice += pNum;
                            } else {
                              resolvedConfigs.push({
                                key: String(cfg.id ?? li),
                                questionLabel: qLabel,
                                hasGroup: false,
                                groupTitle: null,
                                values: [{
                                  displayValue: dVal,
                                  rawValue: rVal,
                                  price: p,
                                }],
                                totalPrice: pNum,
                              });
                            }
                          }
                        }

                        return (
                          <div key={item.id ?? idx} className="p-5 space-y-4 hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                            {/* Item Header */}
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                {itemSnapshot && (
                                  <img
                                    src={itemSnapshot}
                                    alt={itemName}
                                    onClick={() => setImageModalOpen(true)}
                                    className="size-14 rounded-lg border border-slate-200 bg-slate-100 object-contain p-1 cursor-pointer transition-transform hover:scale-105 dark:border-slate-800 dark:bg-slate-800"
                                  />
                                )}
                                <div>
                                  <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                    {itemName}
                                  </h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Quantity: <span className="font-semibold text-slate-700 dark:text-slate-300">{itemQty}</span>
                                    {itemUnitPrice != null && (
                                      <> · Unit Price: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(itemUnitPrice)}</span></>
                                    )}
                                  </p>
                                </div>
                              </div>
                              {itemTotalPrice != null && (
                                <div className="text-right">
                                  <p className="text-xs text-slate-400 uppercase tracking-wide">Item Total</p>
                                  <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {formatCurrency(itemTotalPrice)}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Configurations / Questions Breakdown */}
                            {resolvedConfigs.length > 0 && (
                              <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/40">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                  Configured Options
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {resolvedConfigs.map((cfg) => {
                                    return (
                                      <div
                                        key={cfg.key}
                                        className="flex items-start justify-between rounded-md border border-slate-200/80 bg-white px-3 py-2 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900"
                                      >
                                        <div className="min-w-0 flex-1 pr-2">
                                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                                            {cfg.questionLabel}
                                          </p>

                                          {/* Case 1: Grouped with multiple values -> Hierarchy */}
                                          {cfg.hasGroup && cfg.values.length > 1 ? (
                                            <div className="mt-1 space-y-1">
                                              {cfg.groupTitle && (
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                  {cfg.groupTitle}
                                                </p>
                                              )}
                                              <div className="space-y-0.5">
                                                {cfg.values.map((v, i) => {
                                                  const isHexColor =
                                                    typeof v.rawValue === "string" &&
                                                    /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v.rawValue.trim());
                                                  return (
                                                    <div key={i} className="flex items-center gap-1.5 text-xs">
                                                      {v.subLabel && (
                                                        <span className="text-slate-500 dark:text-slate-400">
                                                          {v.subLabel}:
                                                        </span>
                                                      )}
                                                      {isHexColor && (
                                                        <span
                                                          className="size-3 shrink-0 rounded-full border border-black/10 shadow-xs"
                                                          style={{ backgroundColor: v.rawValue }}
                                                        />
                                                      )}
                                                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {v.displayValue}
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ) : !cfg.hasGroup && cfg.values.length > 1 ? (
                                            /* Case 2: No group, multiple values (e.g. checkboxes) -> inline chips */
                                            <div className="flex flex-wrap items-center gap-1 mt-1">
                                              {cfg.values.map((v, i) => {
                                                const isHexColor =
                                                  typeof v.rawValue === "string" &&
                                                  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v.rawValue.trim());
                                                return (
                                                  <span
                                                    key={i}
                                                    className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                                  >
                                                    {isHexColor && (
                                                      <span
                                                        className="size-2.5 shrink-0 rounded-full border border-black/10"
                                                        style={{ backgroundColor: v.rawValue }}
                                                      />
                                                    )}
                                                    {v.displayValue}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            /* Case 3: Single value -> unchanged */
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              {cfg.values[0] &&
                                                typeof cfg.values[0].rawValue === "string" &&
                                                /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(cfg.values[0].rawValue.trim()) && (
                                                  <span
                                                    className="size-3.5 shrink-0 rounded-full border border-black/10 shadow-xs"
                                                    style={{ backgroundColor: cfg.values[0].rawValue }}
                                                  />
                                                )}
                                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                {cfg.values[0]?.displayValue ?? "—"}
                                              </p>
                                            </div>
                                          )}
                                        </div>

                                        {cfg.totalPrice > 0 && (
                                          <span className="shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">
                                            +{formatCurrency(cfg.totalPrice)}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SurfaceShell>
              </div>

              {/* Right Column: Snapshot Preview and Financial Breakdown */}
              <div className="space-y-6">
                {/* Snapshot preview */}
                {snapshotUrl && (
                  <SurfaceShell className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-200/80 px-5 py-3.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <ImageIcon className="size-4 text-slate-500" />
                        Configured Visual Output
                      </h2>
                    </div>
                    <div className="p-4">
                      <div
                        onClick={() => setImageModalOpen(true)}
                        className="group relative cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
                      >
                        <img
                          src={snapshotUrl}
                          alt="Configured Output Snapshot"
                          className="h-auto w-full object-contain transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 shadow">
                            <Eye className="size-3.5" /> Click to enlarge
                          </span>
                        </div>
                      </div>
                    </div>
                  </SurfaceShell>
                )}

                {/* Financial Breakdown */}
                <SurfaceShell className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-200/80 px-5 py-3.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <CreditCard className="size-4 text-slate-500" />
                      Payment & Pricing Summary
                    </h2>
                  </div>
                  <div className="space-y-3 p-5 text-sm">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(order.subtotal ?? order.total_amount)}
                      </span>
                    </div>

                    {(order.tax_amount != null || order.vat_amount != null) && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Tax / VAT</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(order.tax_amount ?? order.vat_amount)}
                        </span>
                      </div>
                    )}

                    {order.shipping_amount != null && Number(order.shipping_amount) > 0 && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Shipping</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(order.shipping_amount)}
                        </span>
                      </div>
                    )}

                    {order.discount_amount != null && Number(order.discount_amount) > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Discount</span>
                        <span className="font-medium">-{formatCurrency(order.discount_amount)}</span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-3 dark:border-slate-800 flex justify-between items-baseline">
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100">Grand Total</span>
                      <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(order.total_amount ?? order.subtotal)}
                      </span>
                    </div>

                    <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/40 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Order Status:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatOrderStatus(order.order_status)}
                        </span>
                      </div>
                      {order.payment_status && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Payment Status:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatOrderStatus(order.payment_status)}
                          </span>
                        </div>
                      )}
                      {order.transaction_id && (
                        <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-slate-500 truncate">Transaction:</span>
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                            {order.transaction_id}
                          </span>
                        </div>
                      )}
                      {order.failure_reason && (
                        <div className="rounded bg-rose-50 p-2 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
                          <span className="font-semibold">Failure: </span>
                          {order.failure_reason}
                        </div>
                      )}
                    </div>
                  </div>
                </SurfaceShell>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Snapshot Lightbox Modal */}
      {imageModalOpen && snapshotUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-xl bg-slate-900 p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={snapshotUrl}
              alt="Enlarged snapshot preview"
              className="max-h-[85vh] w-auto rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => setImageModalOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default KioskOrderDetailScreen;
