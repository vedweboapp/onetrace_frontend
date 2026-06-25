"use client";

import { useLocale, useTranslations } from "next-intl";
import type { PurchaseOrderCompositeItem, PurchaseOrderDetail } from "@/features/purchase-orders/types/purchase-order.types";
import { PurchaseOrderStatusBadge } from "@/features/purchase-orders/components/purchase-order-status-badge";
import {
  purchaseOrderContactLabel,
  purchaseOrderPaymentTermsLabel,
  purchaseOrderProjectLabel,
  purchaseOrderTotalAmount,
  purchaseOrderVendorLabel,
} from "@/features/purchase-orders/utils/purchase-order-nested-fields.util";
import { formatMoneyDisplay, parseMoneyValue } from "@/features/invoices/utils/invoice-money.util";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailFormattedAddress } from "@/shared/components/layout/detail-formatted-address";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

type Props = {
  detail: PurchaseOrderDetail;
  vendorName?: string;
  contactName?: string;
  dateFmt: Intl.DateTimeFormat;
  dueFmt: Intl.DateTimeFormat;
  statusLabel: string;
  activeTab: "overview" | "lineItems";
};

function AddressBlock({
  title,
  address,
}: {
  title: string;
  address: PurchaseOrderDetail["bill_to"];
}) {
  return (
    <DetailPanelCard title={title}>
      <DetailFormattedAddress
        line1={address?.address_line_1}
        line2={address?.address_line_2}
        city={address?.city}
        state={address?.state}
        pincode={address?.zip_code ?? address?.pincode}
        country={address?.country}
        emptyMessage="—"
      />
    </DetailPanelCard>
  );
}

type DisplayLine = {
  key: string;
  productName: string;
  groupName: string;
  qty: number;
  listPrice: number;
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
  const total =
    row.amount != null && Number.isFinite(row.amount)
      ? row.amount
      : parseMoneyValue(row.line_total);
  const listPrice = qty > 0 && total > 0 ? total / qty : parseMoneyValue(typeof item === "object" ? item?.selling_price : null);
  return {
    key: `composite-${itemId}-${index}`,
    productName,
    groupName,
    qty,
    listPrice,
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
}: Props) {
  const t = useTranslations("Dashboard.purchaseOrders");
  const locale = useLocale();
  const lines = resolveDisplayLines(detail);
  const totalBalance = purchaseOrderTotalAmount(detail);
  const vendorNotes = detail.vendor_notes?.trim() || "";
  const internalNotes = detail.internal_notes?.trim() || "";

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        {activeTab === "overview" ? (
          <>
            <DetailPanelCard title={t("detail.sectionOrderDetails")}>
              <DetailMetricsGrid className="sm:grid-cols-2 lg:grid-cols-4">
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
                <DetailMetricCard label={t("fields.dueDate")}>
                  {formatFlexibleApiDate(detail.due_date, dueFmt)}
                </DetailMetricCard>
                <DetailMetricCard label={t("fields.paymentTerms")}>
                  {purchaseOrderPaymentTermsLabel(detail.payment_terms)}
                </DetailMetricCard>
                <DetailMetricCard label={t("fields.status")}>
                  <PurchaseOrderStatusBadge status={detail.status} label={statusLabel} />
                </DetailMetricCard>
              </DetailMetricsGrid>
            </DetailPanelCard>

            <div className="grid gap-4 lg:grid-cols-2">
              <AddressBlock title={t("fields.billTo")} address={detail.bill_to} />
              <AddressBlock title={t("fields.shipTo")} address={detail.ship_to} />
            </div>

            {vendorNotes ? (
              <DetailPanelCard title={t("fields.vendorNotes")}>
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{vendorNotes}</p>
              </DetailPanelCard>
            ) : null}

            {internalNotes ? (
              <DetailPanelCard title={t("fields.internalNotes")}>
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{internalNotes}</p>
              </DetailPanelCard>
            ) : null}

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
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                      <th className="pb-2 pr-3">{t("lineItems.productName")}</th>
                      <th className="pb-2 pr-3">{t("lineItems.group")}</th>
                      <th className="pb-2 pr-3 text-right">{t("lineItems.qty")}</th>
                      <th className="pb-2 text-right">{t("lineItems.listPrice")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500">
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
                          <td className="py-3 text-right tabular-nums">
                            {formatMoneyDisplay(row.listPrice, locale)}
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
