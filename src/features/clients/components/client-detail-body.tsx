"use client";

import { useTranslations } from "next-intl";
import type { Client } from "@/features/clients/types/client.types";
import { DetailEmailLink, DetailPhoneLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailFormattedAddress } from "@/shared/components/layout/detail-formatted-address";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  DetailStatusMetric,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";

export function ClientDetailBody({
  detail,
  dateFmt,
}: {
  detail: Client;
  dateFmt: Intl.DateTimeFormat;
}) {
  const t = useTranslations("Dashboard.clients");
  const tMeta = useTranslations("Dashboard.common.detail");
  const legacyOnly = detail.address?.trim() ?? "";

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.panelOverview")}>
          <DetailMetricsGrid>
            <DetailStatusMetric
              label={t("detail.metaStatus")}
              isActive={detail.is_active}
              activeLabel={t("status.active")}
              inactiveLabel={t("status.inactive")}
            />
          
            <DetailMetricCard label={t("fields.email")}>
              <DetailEmailLink email={detail.email} />
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.phone")}>
              <DetailPhoneLink phone={detail.phone} empty={t("detail.notProvided")} />
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

        <DetailSystemMetadataSection
          createdAt={detail.created_at}
          modifiedAt={detail.modified_at}
          dateFmt={dateFmt}
          createdBy={detail.created_by}
          modifiedBy={detail.modified_by}
          labels={{
            sectionTitle: tMeta("systemMetadata"),
            createdAt: t("fields.createdAt"),
            updatedAt: t("fields.updatedAt"),
            createdBy: t("fields.createdBy"),
            modifiedBy: tMeta("modifiedBy"),
            notModifiedYet: tMeta("notModifiedYet"),
          }}
        />
      </div>
    </DetailPagePadding>
  );
}
