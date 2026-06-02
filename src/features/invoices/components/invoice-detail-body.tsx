"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import type { InvoiceDetail } from "@/features/invoices/types/invoice.types";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import {
  invoiceClientLabel,
  invoiceContactLabel,
  invoiceJobOrProjectLabel,
  nestedId,
  parseInvoiceAmount,
} from "@/features/invoices/utils/invoice-nested-fields.util";
import { formatMoneyDisplay, parseMoneyValue } from "@/features/invoices/utils/invoice-money.util";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailFormattedAddress } from "@/shared/components/layout/detail-formatted-address";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { invoicePaymentTermsLabel } from "@/features/invoices/utils/invoice-nested-fields.util";

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
  const lines = detail.composite_items ?? detail.line_items ?? [];
  const subtotal =
    detail.subtotal != null
      ? parseMoneyValue(detail.subtotal)
      : lines.reduce(
          (sum, row) =>
            sum +
            parseMoneyValue(
              "line_total" in row
                ? row.line_total
                : "amount" in row
                  ? row.amount ?? row.total
                  : 0,
            ),
          0,
        );
  const taxTotal = parseMoneyValue(detail.tax_total);
  const totalBalance = parseMoneyValue(detail.total_balance ?? detail.amount);

  return (
    <DetailPagePadding className="space-y-6">
      {activeTab === "overview" ? (
        <>
          <DetailPanelCard title={t("detail.sectionInvoiceDetails")}>
            <DetailMetricsGrid className="sm:grid-cols-2 lg:grid-cols-3">
              <DetailMetricCard label={t("fields.clientName")}>
                {invoiceClientLabel(detail.client, clientName)}
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.contactPerson")}>
                {invoiceContactLabel(detail.contact ?? detail.contact_person, contactName)}
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

          {detail.notes_and_terms?.trim() ? (
            <DetailPanelCard title={t("fields.notesAndTerms")}>
              <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                {detail.notes_and_terms}
              </p>
            </DetailPanelCard>
          ) : null}

          <DetailPanelCard>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t("fields.totalBalance")}
              </span>
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
                    <th className="pb-2 pr-3">{t("filterStatus")}</th>
                    <th className="pb-2 pr-3 text-right">{t("lineItems.qty")}</th>
                    <th className="pb-2 pr-3 text-right">{t("lineItems.rate")}</th>
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
                    lines.map((row, i) => {
                      const name =
                        ("item" in row
                          ? (typeof row.item === "object" ? row.item?.name : undefined)
                          : "product_name" in row
                            ? row.product_name ?? row.description ?? "—"
                            : "—")?.trim() || "—";
                      const groupName =
                        "group" in row
                          ? typeof row.group === "object"
                            ? row.group?.name?.trim() || "—"
                            : row.group != null
                              ? `#${row.group}`
                              : "—"
                          : "—";
                      const qty = parseMoneyValue(row.quantity);
                      const rate = parseMoneyValue(
                        "item" in row
                          ? (typeof row.item === "object" ? row.item?.selling_price : null)
                          : "list_price" in row
                            ? row.list_price ?? row.rate
                            : null,
                      );
                      const total = parseMoneyValue(
                        "line_total" in row
                          ? row.line_total
                          : "total" in row
                            ? row.total ?? row.amount
                            : 0,
                      );
                      return (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-3 pr-3 font-medium text-slate-900 dark:text-slate-100">{name}</td>
                          <td className="py-3 pr-3">{groupName}</td>
                          <td className="py-3 pr-3 text-right tabular-nums">{qty.toFixed(2)}</td>
                          <td className="py-3 pr-3 text-right tabular-nums">
                            {formatMoneyDisplay(rate, locale)}
                          </td>
                          <td className="py-3 text-right tabular-nums font-semibold">
                            {formatMoneyDisplay(total, locale)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </DetailPanelCard>

          <DetailPanelCard>
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
    </DetailPagePadding>
  );
}
