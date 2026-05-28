"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Site } from "@/features/sites/types/site.types";
import {
  formatSiteContactPersonContactLabel,
  getSiteContactPersonContactId,
  normalizeSiteContactPersonsFromApi,
} from "@/features/sites/utils/site-contact-person.util";
import { routes } from "@/shared/config/routes";
import { DetailFormattedAddress } from "@/shared/components/layout/detail-formatted-address";
import {
  DetailPageMapLayout,
  detailMapFillClassName,
} from "@/shared/components/layout/detail-page-map-layout";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  DetailStatusMetric,
} from "@/shared/components/layout/detail-metric-card";
import { What3WordsInline } from "@/shared/components/layout/what3words-inline";

const AddressMiniMap = dynamic(
  () => import("@/shared/components/maps/address-mini-map").then((m) => m.AddressMiniMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800" />,
  },
);

export function SiteDetailBody({
  detail,
  dateFmt,
  clientName,
  contactNameById = {},
}: {
  detail: Site;
  dateFmt: Intl.DateTimeFormat;
  clientName: string | null;
  contactNameById?: Record<number, string>;
}) {
  const t = useTranslations("Dashboard.sites");
  const tMeta = useTranslations("Dashboard.common.detail");
  const clientId =
    typeof detail.client === "number"
      ? detail.client
      : typeof detail.client?.id === "number"
        ? detail.client.id
        : null;
  const contactPersonRows = normalizeSiteContactPersonsFromApi(detail);

  const addressParts = {
    line1: detail.address_line_1,
    line2: detail.address_line_2,
    city: detail.city,
    state: detail.state,
    pincode: detail.pincode,
    country: detail.country,
  };

  const mapNode = (
    <AddressMiniMap
      addressParts={addressParts}
      coordinates={
        detail.latitude != null &&
        detail.longitude != null &&
        Number.isFinite(detail.latitude) &&
        Number.isFinite(detail.longitude)
          ? { lat: detail.latitude, lon: detail.longitude }
          : null
      }
      className={detailMapFillClassName}
      mapClassName="h-full min-h-0 flex-1"
    />
  );

  return (
    <DetailPagePadding>
      <DetailPageMapLayout map={mapNode} mapTitle={t("detail.sectionMap")} showMap>
        <DetailPanelCard>
          <DetailMetricsGrid>
            <DetailStatusMetric
              label={t("fields.status")}
              isActive={detail.is_active}
              activeLabel={t("status.active")}
              inactiveLabel={t("status.inactive")}
            />
            <DetailMetricCard label={t("fields.client")}>
              {clientId ? (
                <Link
                  href={`${routes.dashboard.clients}/${clientId}`}
                  className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {clientName ?? `#${clientId}`}
                </Link>
              ) : (
                <span>{clientName ?? "—"}</span>
              )}
            </DetailMetricCard>
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("contactPerson.sectionTitle")}>
          {contactPersonRows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("contactPerson.empty")}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {contactPersonRows.map((row, index) => {
                const contactId = getSiteContactPersonContactId(row.contact);
                const contactLabel = formatSiteContactPersonContactLabel(row.contact, contactNameById);
                return (
                  <li
                    key={row.id ?? `${row.title}-${contactId ?? index}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t(`contactPerson.titles.${row.title}`)}
                    </span>
                    {contactId ? (
                      <Link
                        href={`${routes.dashboard.contacts}/${contactId}`}
                        className="text-sm font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                      >
                        {contactLabel}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-600 dark:text-slate-400">{contactLabel}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionAddress")}>
          <DetailFormattedAddress
            line1={addressParts.line1}
            line2={addressParts.line2}
            city={addressParts.city}
            state={addressParts.state}
            pincode={addressParts.pincode}
            country={addressParts.country}
            emptyMessage={
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>
            }
          />
          <What3WordsInline
            value={detail.what3words}
            label={t("fields.what3words")}
            className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800"
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
      </DetailPageMapLayout>
    </DetailPagePadding>
  );
}
