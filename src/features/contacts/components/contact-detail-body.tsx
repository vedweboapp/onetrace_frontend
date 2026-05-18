"use client";

import { useTranslations } from "next-intl";
import type { Contact } from "@/features/contacts/types/contact.types";
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

type Props = {
  detail: Contact;
  clientName?: string;
  dateFmt: Intl.DateTimeFormat;
};

export function ContactDetailBody({ detail, clientName, dateFmt }: Props) {
  const t = useTranslations("Dashboard.contacts");
  const tUser = useTranslations("Dashboard.common.user");
  const clientId =
    typeof detail.client === "number"
      ? detail.client
      : typeof detail.client?.id === "number"
        ? detail.client.id
        : null;

  const createdByUser =
    detail.created_by && typeof detail.created_by === "object" ? detail.created_by : null;

  return (
    <DetailPagePadding>
      <div className="space-y-3.5">
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailMetricCard label={t("fields.client")}>
              {clientName ?? (clientId ? `#${clientId}` : "—")}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.email")}>
              <DetailEmailLink email={detail.email} />
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.phone")}>
              <DetailPhoneLink phone={detail.phone} />
            </DetailMetricCard>
          </div>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionRecord")}>
          <DetailRecordMetaSection
            isActive={detail.is_active}
            activeLabel={t("status.active")}
            inactiveLabel={t("status.inactive")}
            statusLabel={t("fields.status")}
            createdAtLabel={t("fields.createdAt")}
            updatedAtLabel={t("fields.updatedAt")}
            createdAt={detail.created_at}
            modifiedAt={detail.modified_at}
            dateFmt={dateFmt}
            gridClassName="grid-cols-1 sm:grid-cols-2"
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
            line2Fallback={t("detail.addressLine2Empty")}
            emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>}
          />
        </DetailPanelCard>

        {createdByUser ? (
          <DetailCreatedBySection
            title={t("fields.createdBy")}
            user={createdByUser}
            usernameLabel={tUser("username")}
            emailLabel={tUser("email")}
          />
        ) : null}
      </div>
    </DetailPagePadding>
  );
}
