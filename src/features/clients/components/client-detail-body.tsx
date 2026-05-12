"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Client } from "@/features/clients/types/client.types";
import { DetailFormattedAddress } from "@/shared/components/layout/detail-formatted-address";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { ActiveStatusBadge } from "@/shared/ui";

export function ClientDetailBody({
  detail,
  dateFmt,
}: {
  detail: Client;
  dateFmt: Intl.DateTimeFormat;
}) {
  const t = useTranslations("Dashboard.clients");
  const legacyOnly = detail.address?.trim() ?? "";

  const phoneRaw = typeof detail.phone === "string" ? detail.phone.trim() : "";
  const telHref = phoneRaw ? `tel:${phoneRaw.replace(/\s/g, "")}` : null;

  const metaRow = (label: string, value: ReactNode) => (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <div className="text-right text-sm font-medium text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );

  return (
    <DetailPagePadding>
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <DetailPanelCard title={t("detail.panelOverview")}>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{detail.name}</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailMetricCard label={t("fields.email")}>
                <a
                  href={`mailto:${detail.email}`}
                  className="break-all font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {detail.email}
                </a>
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.phone")}>
                {telHref ? (
                  <a
                    href={telHref}
                    className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                  >
                    {phoneRaw}
                  </a>
                ) : (
                  <span className="font-normal text-slate-500 dark:text-slate-400">{t("detail.notProvided")}</span>
                )}
              </DetailMetricCard>
            </div>
          </DetailPanelCard>

          <DetailPanelCard title={t("detail.panelMetaInfo")}>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {metaRow(
                t("detail.metaStatus"),
                <ActiveStatusBadge
                  active={detail.is_active}
                  label={detail.is_active ? t("status.active") : t("status.inactive")}
                />,
              )}
              {metaRow(t("fields.createdAt"), dateFmt.format(new Date(detail.created_at)))}
              {metaRow(t("fields.updatedAt"), dateFmt.format(new Date(detail.modified_at)))}
              {metaRow(t("detail.metaClientId"), <span className="tabular-nums">{detail.id}</span>)}
            </div>
          </DetailPanelCard>
        </div>

        <DetailPanelCard title={t("detail.sectionAddress")}>
          <DetailFormattedAddress
            line1={detail.address_line_1}
            line2={detail.address_line_2}
            city={detail.city}
            state={detail.state}
            pincode={detail.pincode}
            country={detail.country}
            legacySingleLine={legacyOnly}
            line2Fallback={t("detail.addressLine2Empty")}
            emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>}
          />
        </DetailPanelCard>
      </div>

      {detail.created_by ? (
        <DetailPanelCard title={t("fields.createdBy")}>
          <span className="block font-medium">{detail.created_by.username}</span>
          <span className="mt-1 block text-sm font-normal text-slate-500 dark:text-slate-400">{detail.created_by.email}</span>
        </DetailPanelCard>
      ) : null}
    </DetailPagePadding>
  );
}
