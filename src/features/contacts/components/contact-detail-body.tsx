"use client";

import { useTranslations } from "next-intl";
import type { Contact } from "@/features/contacts/types/contact.types";
import {
  getContactClientId,
  getContactType,
  getContactVendorId,
} from "@/features/contacts/utils/contact-nested-fields.util";
import {
  DetailEmailLink,
  DetailEntityLink,
  DetailPhoneLink,
  DetailSystemMetadataSection,
} from "@/shared/components/entity";
import { DetailFormattedAddress } from "@/shared/components/layout/detail-formatted-address";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  DetailStatusMetric,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";

type Props = {
  detail: Contact;
  clientName?: string;
  vendorName?: string;
  dateFmt: Intl.DateTimeFormat;
};

export function ContactDetailBody({ detail, clientName, vendorName, dateFmt }: Props) {
  const t = useTranslations("Dashboard.contacts");
  const tMeta = useTranslations("Dashboard.common.detail");
  const contactType = getContactType(detail);
  const clientId = getContactClientId(detail);
  const vendorId = getContactVendorId(detail);

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <DetailMetricsGrid>
            <DetailStatusMetric
              label={t("fields.status")}
              isActive={detail.is_active}
              activeLabel={t("status.active")}
              inactiveLabel={t("status.inactive")}
            />
            <DetailMetricCard label={t("fields.contactType")}>
              {contactType === "vendor" ? t("tabs.vendor") : t("tabs.client")}
            </DetailMetricCard>
            {contactType === "vendor" ? (
              <DetailMetricCard label={t("fields.vendor")}>
                {vendorId ? (
                  <DetailEntityLink
                    href={`${routes.dashboard.vendors}/${vendorId}`}
                    className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                  >
                    {vendorName ?? `#${vendorId}`}
                  </DetailEntityLink>
                ) : (
                  <span>{vendorName ?? "—"}</span>
                )}
              </DetailMetricCard>
            ) : (
              <DetailMetricCard label={t("fields.client")}>
                {clientId ? (
                  <DetailEntityLink
                    href={`${routes.dashboard.clients}/${clientId}`}
                    className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                  >
                    {clientName ?? `#${clientId}`}
                  </DetailEntityLink>
                ) : (
                  <span>{clientName ?? "—"}</span>
                )}
              </DetailMetricCard>
            )}
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
