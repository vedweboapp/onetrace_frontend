"use client";

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
  const tUser = useTranslations("Dashboard.common.user");
  const legacyOnly = detail.address?.trim() ?? "";

  const phoneRaw = typeof detail.phone === "string" ? detail.phone.trim() : "";
  const telHref = phoneRaw ? `tel:${phoneRaw.replace(/\s/g, "")}` : null;

  return (
    <DetailPagePadding>
      <div className="space-y-3">
        <DetailPanelCard title={t("detail.panelOverview")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <DetailMetricsGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <DetailMetricCard label={t("detail.metaStatus")}>
              <ActiveStatusBadge
                active={detail.is_active}
                label={detail.is_active ? t("status.active") : t("status.inactive")}
              />
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.createdAt")}>
              <span className="tabular-nums">{dateFmt.format(new Date(detail.created_at))}</span>
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.updatedAt")}>
              <span className="tabular-nums">{dateFmt.format(new Date(detail.modified_at))}</span>
            </DetailMetricCard>
            <DetailMetricCard label={t("detail.metaClientId")}>
              <span className="tabular-nums">{detail.id}</span>
            </DetailMetricCard>
          </DetailMetricsGrid>
        </DetailPanelCard>

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

        {detail.created_by ? (
          <DetailPanelCard title={t("fields.createdBy")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailMetricCard label={tUser("username")}>{detail.created_by.username}</DetailMetricCard>
              <DetailMetricCard label={tUser("email")}>
                <a
                  href={`mailto:${detail.created_by.email}`}
                  className="break-all font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {detail.created_by.email}
                </a>
              </DetailMetricCard>
            </div>
          </DetailPanelCard>
        ) : null}
      </div>
    </DetailPagePadding>
  );
}
