"use client";

import { useTranslations } from "next-intl";
import type { Contact } from "@/features/contacts/types/contact.types";
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

type Props = {
  detail: Contact;
  clientName?: string;
  dateFmt: Intl.DateTimeFormat;
};

export function ContactDetailBody({ detail, clientName, dateFmt }: Props) {
  const t = useTranslations("Dashboard.contacts");
  const tMeta = useTranslations("Dashboard.common.detail");
  const clientId =
    typeof detail.client === "number"
      ? detail.client
      : typeof detail.client?.id === "number"
        ? detail.client.id
        : null;

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard>
          <DetailMetricsGrid>
            <DetailStatusMetric
              label={t("fields.status")}
              isActive={detail.is_active}
              activeLabel={t("status.active")}
              inactiveLabel={t("status.inactive")}
            />
            <DetailMetricCard label={t("fields.client")}>
              {clientName ?? (clientId ? `#${clientId}` : "—")}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.email")}>
              <DetailEmailLink email={detail.email} />
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.phone")}>
              <DetailPhoneLink phone={detail.phone} />
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
