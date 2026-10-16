"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { DetailEntityLink } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import type { PurchaseReceiveDetail } from "@/features/purchase-receives/types/purchase-receive.types";
import { PurchaseReceiveStatusBadge } from "@/features/purchase-receives/components/purchase-receive-status-badge";
import {
  nestedId,
  purchaseReceivePoLabel,
  purchaseReceiveVendorLabel,
} from "@/features/purchase-receives/utils/purchase-receive-nested-fields.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

type Props = {
  detail: PurchaseReceiveDetail;
  activeTab: "overview" | "lineItems";
  statusLabel: (code: string | null | undefined) => string;
  vendorNames: Record<number, string>;
  dateFmt: Intl.DateTimeFormat;
};

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[12rem_1fr] dark:border-slate-800">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="text-sm text-slate-900 dark:text-slate-100">{children}</dd>
    </div>
  );
}

export function PurchaseReceiveDetailBody({
  detail,
  activeTab,
  statusLabel,
  vendorNames,
  dateFmt,
}: Props) {
  const t = useTranslations("Dashboard.purchaseReceives");
  const vendorId = nestedId(detail.vendor);
  const poId = nestedId(detail.purchase_order);
  const vendorLabel = purchaseReceiveVendorLabel(
    detail.vendor,
    vendorId != null ? vendorNames[vendorId] : undefined,
  );
  const poLabel = purchaseReceivePoLabel(detail);
  const lines = detail.line_items ?? [];
  const attachments = detail.attachments ?? [];

  if (activeTab === "lineItems") {
    return (
      <section className="space-y-4 p-4 sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("detail.sectionLineItems")}
        </h2>
        {lines.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("lineItems.empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                  <th className="px-3 py-2">{t("lineItems.item")}</th>
                  <th className="px-3 py-2">{t("lineItems.orderedQty")}</th>
                  <th className="px-3 py-2">{t("lineItems.receivedQty")}</th>
                  <th className="px-3 py-2">{t("lineItems.billedQty")}</th>
                  <th className="px-3 py-2">{t("lineItems.unitPrice")}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((row, index) => {
                  const itemId = nestedId(row.item);
                  const name =
                    row.purchase_order_snapshot?.item_name?.trim() ||
                    (itemId != null ? `#${itemId}` : "—");
                  const unitPrice = row.purchase_order_snapshot?.unit_price;
                  return (
                    <tr
                      key={row.id ?? `${itemId}-${index}`}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{name}</td>
                      <td className="px-3 py-2 tabular-nums">{row.ordered_quantity ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{row.received_quantity ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{row.billed_quantity ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{unitPrice ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("detail.sectionReceiveDetails")}
        </h2>
        <dl>
          <MetaRow label={t("fields.purchaseReceiveNumber")}>
            {detail.purchase_receive_number?.trim() || "—"}
          </MetaRow>
          <MetaRow label={t("fields.status")}>
            <PurchaseReceiveStatusBadge status={detail.status} label={statusLabel(detail.status)} />
          </MetaRow>
          <MetaRow label={t("fields.receiveDate")}>
            {formatFlexibleApiDate(detail.receive_date, dateFmt) || "—"}
          </MetaRow>
          <MetaRow label={t("fields.vendor")}>
            {vendorId != null ? (
              <DetailEntityLink href={`${routes.dashboard.vendors}/${vendorId}`}>{vendorLabel}</DetailEntityLink>
            ) : (
              vendorLabel
            )}
          </MetaRow>
          <MetaRow label={t("fields.purchaseOrder")}>
            {poId != null ? (
              <DetailEntityLink href={`${routes.dashboard.purchaseOrders}/${poId}`}>{poLabel}</DetailEntityLink>
            ) : (
              poLabel
            )}
          </MetaRow>
          <MetaRow label={t("fields.trackingNumber")}>{detail.tracking_number?.trim() || "—"}</MetaRow>
          <MetaRow label={t("fields.trackingLink")}>
            {detail.tracking_link?.trim() ? (
              <a
                href={detail.tracking_link}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sky-700 hover:underline dark:text-sky-300"
              >
                {detail.tracking_link}
              </a>
            ) : (
              "—"
            )}
          </MetaRow>
          <MetaRow label={t("fields.totalQuantityReceived")}>
            {detail.total_quantity_received != null ? String(detail.total_quantity_received) : "—"}
          </MetaRow>
          <MetaRow label={t("fields.notes")}>{detail.notes?.trim() || "—"}</MetaRow>
        </dl>
      </section>

      {attachments.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("detail.sectionAttachments")}
          </h2>
          <ul className="space-y-2">
            {attachments.map((file) => (
              <li key={file.id}>
                <a
                  href={file.file}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-sky-700 hover:underline dark:text-sky-300"
                >
                  {file.file_name?.trim() || `Attachment #${file.id}`}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("detail.sectionSystemMetadata")}
        </h2>
        <dl>
          <MetaRow label={t("fields.createdAt")}>
            {formatFlexibleApiDate(detail.created_at, dateFmt) || "—"}
          </MetaRow>
          <MetaRow label={t("fields.updatedAt")}>
            {formatFlexibleApiDate(detail.modified_at, dateFmt) || t("detail.notModifiedYet")}
          </MetaRow>
          <MetaRow label={t("fields.createdBy")}>
            {detail.created_by?.username || detail.created_by?.email || "—"}
          </MetaRow>
          <MetaRow label={t("fields.modifiedBy")}>
            {detail.modified_by?.username || detail.modified_by?.email || "—"}
          </MetaRow>
        </dl>
      </section>
    </div>
  );
}
