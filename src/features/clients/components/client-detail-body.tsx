"use client";

import { useTranslations } from "next-intl";
import type { Client } from "@/features/clients/types/client.types";
import {
  DetailCreatedBySection,
  DetailEmailLink,
  DetailPhoneLink,
  DetailRecordMetaSection,
} from "@/shared/components/entity";
import { DetailFormattedAddress } from "@/shared/components/layout/detail-formatted-address";
import {
  DetailMetricCard,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";

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

  return (
    <DetailPagePadding>
      <div className="space-y-3">
        <DetailPanelCard title={t("detail.panelOverview")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailMetricCard label={t("fields.email")}>
              <DetailEmailLink email={detail.email} />
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.phone")}>
              <DetailPhoneLink phone={detail.phone} empty={t("detail.notProvided")} />
            </DetailMetricCard>
          </div>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.panelMetaInfo")}>
          <DetailRecordMetaSection
            isActive={detail.is_active}
            activeLabel={t("status.active")}
            inactiveLabel={t("status.inactive")}
            statusLabel={t("detail.metaStatus")}
            createdAtLabel={t("fields.createdAt")}
            updatedAtLabel={t("fields.updatedAt")}
            createdAt={detail.created_at}
            modifiedAt={detail.modified_at}
            dateFmt={dateFmt}
            extra={
              <DetailMetricCard label={t("detail.metaClientId")}>
                <span className="tabular-nums">{detail.id}</span>
              </DetailMetricCard>
            }
          />
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
          <DetailCreatedBySection
            title={t("fields.createdBy")}
            user={detail.created_by}
            usernameLabel={tUser("username")}
            emailLabel={tUser("email")}
          />
        ) : null}
      </div>
    </DetailPagePadding>
  );
}
