"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { Vendor } from "@/features/vendors/types/vendor.types";
import { VendorTypeChip } from "@/features/vendor-types/components/vendor-type-chip";
import { getVendorTypeRow, parseVendorCoord } from "@/features/vendors/utils/vendor-nested-fields.util";
import { DetailEmailLink, DetailPhoneLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailFormattedAddress } from "@/shared/components/layout/detail-formatted-address";
import {
  DetailPageMapLayout,
  detailMapFillClassName,
} from "@/shared/components/layout/detail-page-map-layout";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  DetailStatusMetric,
} from "@/shared/components/layout/detail-metric-card";
import type { AddressMapPoint } from "@/shared/components/maps/google-address-multi-mini-map";

const AddressMultiMiniMap = dynamic(
  () => import("@/shared/components/maps/address-multi-mini-map").then((m) => m.AddressMultiMiniMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800" />,
  },
);

export function VendorDetailBody({
  detail,
  dateFmt,
}: {
  detail: Vendor;
  dateFmt: Intl.DateTimeFormat;
}) {
  const t = useTranslations("Dashboard.vendors");
  const tMeta = useTranslations("Dashboard.common.detail");
  const typeRow = getVendorTypeRow(detail);
  const addresses = detail.addresses ?? [];

  const mapPoints: AddressMapPoint[] = addresses.map((addr, index) => {
    const lat = parseVendorCoord(addr.latitude);
    const lon = parseVendorCoord(addr.longitude);
    return {
      id: addr.id ?? index,
      label: addr.is_primary ? t("addresses.primary") : t("addresses.rowLabel", { index: index + 1 }),
      addressParts: {
        line1: addr.address_line_1,
        line2: addr.address_line_2,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        country: addr.country,
      },
      coordinates: lat != null && lon != null ? { lat, lon } : null,
    };
  });

  const mapNode = (
    <AddressMultiMiniMap points={mapPoints} className={detailMapFillClassName} mapClassName="h-full min-h-0 flex-1" />
  );

  return (
    <DetailPagePadding>
      <DetailPageMapLayout map={mapNode} mapTitle={t("detail.sectionMap")} showMap>
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <DetailMetricsGrid compact>
            <DetailStatusMetric
              label={t("fields.status")}
              isActive={detail.is_active}
              activeLabel={t("status.active")}
              inactiveLabel={t("status.inactive")}
            />
            <DetailMetricCard label={t("fields.type")}>
              {typeRow ? <VendorTypeChip row={typeRow} /> : "—"}
            </DetailMetricCard>
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
                  key={addr.id ?? index}
                  className="rounded-lg border border-slate-100 p-4 dark:border-slate-800"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {t(`addressType.${addr.address_type ?? "other"}`)}
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
      </DetailPageMapLayout>
    </DetailPagePadding>
  );
}
