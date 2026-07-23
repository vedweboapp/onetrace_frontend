"use client";

import { useTranslations } from "next-intl";
import type { Client } from "@/features/clients/types/client.types";
import { resolveClientAddresses } from "@/features/clients/utils/client-form-map";
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
  const addresses = resolveClientAddresses(detail);

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

        <DetailPanelCard title={t("fields.addresses")}>
          {addresses.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>
          ) : (
            <ul className="space-y-4">
              {addresses.map((addr, index) => (
                <li
                  key={addr.id ?? `${addr.address_type}-${index}`}
                  className="rounded-lg border border-slate-100 p-4 dark:border-slate-800"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {t(`addressType.${addr.address_type}`)}
                    </span>
                    {addr.is_primary ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {t("addresses.primary")}
                      </span>
                    ) : null}
                  </div>
                  <DetailFormattedAddress
                    line1={addr.address_line_1}
                    line2={addr.address_line_2}
                    city={addr.city}
                    state={addr.state}
                    pincode={addr.pincode}
                    country={addr.country}
                    line2Fallback={t("detail.addressLine2Empty")}
                    emptyMessage={
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
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
