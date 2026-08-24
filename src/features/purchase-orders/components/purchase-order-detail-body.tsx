"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { updatePurchaseOrder } from "@/features/purchase-orders/api/purchase-order.api";
import type { PurchaseOrderCompositeItem, PurchaseOrderDetail } from "@/features/purchase-orders/types/purchase-order.types";
import { PurchaseOrderStatusBadge } from "@/features/purchase-orders/components/purchase-order-status-badge";
import {
  purchaseOrderContactLabel,
  purchaseOrderPaymentTermsLabel,
  purchaseOrderProjectLabel,
  purchaseOrderTotalAmount,
  purchaseOrderVendorLabel,
} from "@/features/purchase-orders/utils/purchase-order-nested-fields.util";
import { resolvePurchaseOrderAddresses } from "@/features/purchase-orders/utils/purchase-order-form-map";
import { computeLineAmount, formatMoneyDisplay, parseMoneyValue } from "@/features/invoices/utils/invoice-money.util";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import { DetailFormattedAddress } from "@/shared/components/layout/detail-formatted-address";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { useDetailPatch } from "@/shared/hooks/use-entity-detail-screen";
import {
  formatApiDateForHtmlDateInput,
  formatFlexibleApiDate,
} from "@/shared/utils/api-date-parse.util";

type Props = {
  detail: PurchaseOrderDetail;
  vendorName?: string;
  contactName?: string;
  dateFmt: Intl.DateTimeFormat;
  dueFmt: Intl.DateTimeFormat;
  statusLabel: string;
  activeTab: "overview" | "lineItems";
  /** Refresh detail after a successful quick-edit PATCH. */
  onSaved?: () => void;
};

type DisplayLine = {
  key: string;
  productName: string;
  groupName: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

function compositeLineToDisplay(row: PurchaseOrderCompositeItem, index: number): DisplayLine {
  const item = row.item;
  const group = row.group;
  const qty = parseMoneyValue(row.quantity);
  const productName =
    row.name?.trim() ||
    (typeof item === "object" ? item?.name?.trim() : undefined) ||
    "—";
  const groupName =
    typeof group === "object" ? group?.name?.trim() || "—" : "—";
  const itemId =
    typeof row.id === "number"
      ? row.id
      : typeof item === "object"
        ? item?.id
        : typeof item === "number"
          ? item
          : index;
  const amount =
    row.amount != null && Number.isFinite(row.amount)
      ? row.amount
      : parseMoneyValue(row.line_total);
  const unitPrice =
    qty > 0 && amount > 0
      ? amount / qty
      : parseMoneyValue(typeof item === "object" ? item?.selling_price : null);
  return {
    key: `composite-${itemId}-${index}`,
    productName,
    groupName,
    qty,
    unitPrice,
    amount: amount > 0 ? amount : computeLineAmount(qty, unitPrice),
  };
}

function resolveDisplayLines(detail: PurchaseOrderDetail): DisplayLine[] {
  if (detail.composite_items?.length) {
    return detail.composite_items.map(compositeLineToDisplay);
  }
  return [];
}

export function PurchaseOrderDetailBody({
  detail,
  vendorName,
  contactName,
  dateFmt,
  dueFmt,
  statusLabel,
  activeTab,
  onSaved,
}: Props) {
  const t = useTranslations("Dashboard.purchaseOrders");
  const tActions = useTranslations("Dashboard.common.actions");
  const locale = useLocale();
  const lines = resolveDisplayLines(detail);
  const addresses = resolvePurchaseOrderAddresses(detail);
  const totalBalance = purchaseOrderTotalAmount(detail);
  const vendorNotes = detail.vendor_notes?.trim() ?? "";
  const internalNotes = detail.internal_notes?.trim() ?? "";
  const paymentTermsValue = (detail.payment_terms ?? "").trim();

  const paymentTermOptions = React.useMemo(
    () => [
      { value: "net_7", label: t("paymentTerms.net7") },
      { value: "net_45", label: t("paymentTerms.net45") },
      { value: "net_30", label: t("paymentTerms.net30") },
      { value: "net_15", label: t("paymentTerms.net15") },
      { value: "due_on_receipt", label: t("paymentTerms.dueOnReceipt") },
    ],
    [t],
  );

  const patchField = useDetailPatch(
    (body: Parameters<typeof updatePurchaseOrder>[1]) => updatePurchaseOrder(detail.id, body),
    { success: t("updatedToast"), error: t("updateError") },
    onSaved,
  );

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        {activeTab === "overview" ? (
          <>
            <DetailPanelCard title={t("detail.sectionOrderDetails")}>
              <DetailMetricsGrid>
                <DetailMetricCard label={t("fields.vendorName")}>
                  {purchaseOrderVendorLabel(detail.vendor, vendorName)}
                </DetailMetricCard>
                <DetailMetricCard label={t("fields.contactPerson")}>
                  {purchaseOrderContactLabel(detail.contact, contactName)}
                </DetailMetricCard>
                <DetailMetricCard label={t("fields.purchaseOrderNumber")}>
                  {detail.purchase_order_number}
                </DetailMetricCard>
                <DetailMetricCard label={t("fields.projectName")}>
                  {purchaseOrderProjectLabel(detail)}
                </DetailMetricCard>
                <DetailMetricCard label={t("fields.issueDate")}>
                  {formatFlexibleApiDate(detail.issue_date, dueFmt)}
                </DetailMetricCard>
                <DetailEditableField
                  label={t("fields.dueDate")}
                  value={formatApiDateForHtmlDateInput(detail.due_date)}
                  kind="text"
                  editAriaLabel={tActions("edit")}
                  empty="—"
                  onSave={(next) => patchField({ due_date: next || undefined })}
                >
                  {formatFlexibleApiDate(detail.due_date, dueFmt) !== "—"
                    ? formatFlexibleApiDate(detail.due_date, dueFmt)
                    : null}
                </DetailEditableField>
                <DetailEditableField
                  label={t("fields.paymentTerms")}
                  value={paymentTermsValue}
                  kind="select"
                  options={paymentTermOptions}
                  editAriaLabel={tActions("edit")}
                  empty="—"
                  onSave={(next) => patchField({ payment_terms: next })}
                >
                  {paymentTermsValue ? purchaseOrderPaymentTermsLabel(detail.payment_terms) : null}
                </DetailEditableField>
                <DetailMetricCard label={t("fields.status")}>
                  <PurchaseOrderStatusBadge status={detail.status} label={statusLabel} />
                </DetailMetricCard>
              </DetailMetricsGrid>
            </DetailPanelCard>

            <DetailPanelCard title={t("fields.addresses")}>
              {addresses.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">—</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {addresses.map((addr, index) => (
                    <div
                      key={addr.id ?? `${addr.address_type}-${index}`}
                      className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {t(`addressType.${addr.address_type}`)}
                        </span>
                        {addr.is_primary ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {t("addresses.primary")}
                          </span>
                        ) : null}
                      </div>
                      <DetailFormattedAddress
                        line1={addr.address_line_1}
                        line2={addr.address_line_2}
                        city={addr.city}
                        state={addr.state}
                        pincode={addr.pincode}
                        country={addr.country}
                        emptyMessage="—"
                      />
                    </div>
                  ))}
                </div>
              )}
            </DetailPanelCard>

            <DetailPanelCard title={t("fields.vendorNotes")}>
              <DetailEditableField
                label={<span className="sr-only">{t("fields.vendorNotes")}</span>}
                value={vendorNotes}
                kind="text"
                editAriaLabel={tActions("edit")}
                empty="—"
                onSave={(next) => patchField({ vendor_notes: next })}
              >
                {vendorNotes ? (
                  <p className="whitespace-pre-wrap text-sm font-normal text-slate-700 dark:text-slate-300">
                    {vendorNotes}
                  </p>
                ) : null}
              </DetailEditableField>
            </DetailPanelCard>

            <DetailPanelCard title={t("fields.internalNotes")}>
              <DetailEditableField
                label={<span className="sr-only">{t("fields.internalNotes")}</span>}
                value={internalNotes}
                kind="text"
                editAriaLabel={tActions("edit")}
                empty="—"
                onSave={(next) => patchField({ internal_notes: next })}
              >
                {internalNotes ? (
                  <p className="whitespace-pre-wrap text-sm font-normal text-slate-700 dark:text-slate-300">
                    {internalNotes}
                  </p>
                ) : null}
              </DetailEditableField>
            </DetailPanelCard>

            <DetailSystemMetadataSection
              createdAt={detail.created_at ?? new Date().toISOString()}
              modifiedAt={detail.modified_at}
              dateFmt={dateFmt}
              createdBy={detail.created_by}
              modifiedBy={detail.modified_by}
              labels={{
                sectionTitle: t("detail.sectionSystemMetadata"),
                createdAt: t("fields.createdAt"),
                updatedAt: t("fields.updatedAt"),
                createdBy: t("fields.createdBy"),
                modifiedBy: t("fields.modifiedBy"),
                notModifiedYet: t("detail.notModifiedYet"),
              }}
            />
          </>
        ) : (
          <>
            <DetailPanelCard title={t("detail.sectionLineItems")}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                      <th className="pb-2 pr-3">{t("lineItems.productName")}</th>
                      <th className="pb-2 pr-3">{t("lineItems.group")}</th>
                      <th className="pb-2 pr-3 text-right">{t("lineItems.qty")}</th>
                      <th className="pb-2 pr-3 text-right">{t("lineItems.rate")}</th>
                      <th className="pb-2 text-right">{t("lineItems.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          {t("lineItems.empty")}
                        </td>
                      </tr>
                    ) : (
                      lines.map((row) => (
                        <tr key={row.key} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-3 pr-3 font-medium text-slate-900 dark:text-slate-100">
                            {row.productName}
                          </td>
                          <td className="py-3 pr-3 text-slate-600 dark:text-slate-400">{row.groupName}</td>
                          <td className="py-3 pr-3 text-right tabular-nums">{row.qty.toFixed(2)}</td>
                          <td className="py-3 pr-3 text-right tabular-nums">
                            {formatMoneyDisplay(row.unitPrice, locale)}
                          </td>
                          <td className="py-3 text-right tabular-nums">
                            {formatMoneyDisplay(row.amount, locale)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </DetailPanelCard>

            <DetailPanelCard title={t("totals.totalAmount")}>
              <div className="flex items-center justify-end gap-4">
                <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatMoneyDisplay(totalBalance, locale)}
                </span>
              </div>
            </DetailPanelCard>
          </>
        )}
      </div>
    </DetailPagePadding>
  );
}
