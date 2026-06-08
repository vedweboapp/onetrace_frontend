"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import type { InvoiceCompositeItem, InvoiceDetail, InvoiceLineItem } from "@/features/invoices/types/invoice.types";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import {
  invoiceClientLabel,
  invoiceContactPersonLabel,
  invoiceJobOrProjectLabel,
  invoicePaymentTermsLabel,
  invoiceTotalAmount,
} from "@/features/invoices/utils/invoice-nested-fields.util";
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
  detail: InvoiceDetail;
  clientName?: string;
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
  address: InvoiceDetail["bill_to"];
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
  total: number;
};

function compositeLineToDisplay(row: InvoiceCompositeItem, index: number): DisplayLine {
  const item = row.item;
  const group = row.group;
  const qty = parseMoneyValue(row.quantity);
  const productName =
    row.name?.trim() ||
    (typeof item === "object" ? item?.name?.trim() : undefined) ||
    "—";
  const groupName =
    typeof group === "object"
      ? group?.name?.trim() || "—"
      : group != null
        ? `#${group}`
        : "—";
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
    total,
  };
}

function legacyLineToDisplay(row: InvoiceLineItem, index: number): DisplayLine {
  const productName = (row.product_name ?? row.description ?? "—").trim() || "—";
  return {
    key: `line-${row.id ?? index}`,
    productName,
    groupName: "—",
    qty: parseMoneyValue(row.quantity),
    listPrice: parseMoneyValue(row.list_price ?? row.rate),
    total: parseMoneyValue(row.total ?? row.amount),
  };
}

function resolveDisplayLines(detail: InvoiceDetail): DisplayLine[] {
  if (detail.composite_items?.length) {
    return detail.composite_items.map(compositeLineToDisplay);
  }
  if (detail.line_items?.length) {
    return detail.line_items.map(legacyLineToDisplay);
  }
  return [];
}

function resolveSubtotal(detail: InvoiceDetail, lines: DisplayLine[]): number {
  if (detail.subtotal != null) return parseMoneyValue(detail.subtotal);
  if (detail.sub_total != null) return parseMoneyValue(detail.sub_total);
  return lines.reduce((sum, row) => sum + row.total, 0);
}

export function InvoiceDetailBody({
  detail,
  clientName,
  contactName,
  dateFmt,
  dueFmt,
  statusLabel,
  activeTab,
}: Props) {
  const t = useTranslations("Dashboard.invoices");
  const locale = useLocale();
  const billTo = detail.bill_to ?? detail.billing_address;
  const shipTo = detail.ship_to ?? detail.shipping_address;
  const lines = resolveDisplayLines(detail);
  const subtotal = resolveSubtotal(detail, lines);
  const taxTotal = parseMoneyValue(detail.tax_total);
  const totalBalance = invoiceTotalAmount(detail);
  const clientNotes =
    detail.client_notes?.trim() || detail.notes_and_terms?.trim() || "";
  const internalNotes = detail.internal_notes?.trim() || "";

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
      {activeTab === "overview" ? (
        <>
          <DetailPanelCard title={t("detail.sectionInvoiceDetails")}>
            <DetailMetricsGrid className="sm:grid-cols-2 lg:grid-cols-4">
              <DetailMetricCard label={t("fields.clientName")}>
                {invoiceClientLabel(detail.client, clientName)}
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.contactPerson")}>
                {invoiceContactPersonLabel(detail, contactName)}
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.invoiceNumber")}>
                {detail.invoice_number}
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.projectName")}>
                {invoiceJobOrProjectLabel(detail)}
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.issueDate")}>
                {formatFlexibleApiDate(detail.issue_date, dueFmt)}
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.dueDate")}>
                {formatFlexibleApiDate(detail.due_date, dueFmt)}
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.paymentTerms")}>
                {invoicePaymentTermsLabel(detail.payment_terms)}
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.status")}>
                <InvoiceStatusBadge status={detail.status} label={statusLabel} />
              </DetailMetricCard>
            </DetailMetricsGrid>
          </DetailPanelCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <AddressBlock title={t("fields.billTo")} address={billTo} />
            <AddressBlock title={t("fields.shipTo")} address={shipTo} />
          </div>

          {clientNotes ? (
            <DetailPanelCard title={t("fields.notesAndTerms")}>
              <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                {clientNotes}
              </p>
            </DetailPanelCard>
          ) : null}

          {internalNotes ? (
            <DetailPanelCard title={t("fields.internalNotes")}>
              <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                {internalNotes}
              </p>
            </DetailPanelCard>
          ) : null}

          <DetailPanelCard title={t("fields.totalBalance")}>
            <div className="flex items-center justify-between gap-4">
              <span className="sr-only">{t("fields.totalBalance")}</span>
              <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatMoneyDisplay(totalBalance, locale)}
              </span>
            </div>
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
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                    <th className="pb-2 pr-3">{t("lineItems.productName")}</th>
                    <th className="pb-2 pr-3">{t("lineItems.group")}</th>
                    <th className="pb-2 pr-3 text-right">{t("lineItems.qty")}</th>
                    <th className="pb-2 pr-3 text-right">{t("lineItems.listPrice")}</th>
                    <th className="pb-2 text-right">{t("lineItems.total")}</th>
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
                          {formatMoneyDisplay(row.listPrice, locale)}
                        </td>
                        <td className="py-3 text-right tabular-nums font-semibold">
                          {formatMoneyDisplay(row.total, locale)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </DetailPanelCard>

          <DetailPanelCard title={t("totals.totalAmount")}>
            <div className="ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-600 dark:text-slate-400">{t("totals.subtotal")}</span>
                <span className="font-medium tabular-nums">{formatMoneyDisplay(subtotal, locale)}</span>
              </div>
              {taxTotal > 0 ? (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-600 dark:text-slate-400">
                    {detail.tax_percent != null && String(detail.tax_percent).trim()
                      ? t("totals.taxWithPercent", { percent: detail.tax_percent })
                      : t("totals.tax")}
                  </span>
                  <span className="font-medium tabular-nums">{formatMoneyDisplay(taxTotal, locale)}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 dark:border-slate-700">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {t("fields.totalBalance")}
                </span>
                <span className="text-lg font-bold tabular-nums">{formatMoneyDisplay(totalBalance, locale)}</span>
              </div>
            </div>
          </DetailPanelCard>
        </>
      )}
      </div>
    </DetailPagePadding>
  );
}
