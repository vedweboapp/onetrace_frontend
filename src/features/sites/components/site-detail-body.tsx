"use client";

import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Site } from "@/features/sites/types/site.types";
import { routes } from "@/shared/config/routes";
import { DetailFormattedAddress } from "@/shared/components/layout/detail-formatted-address";
import {
  DetailMetricCard,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { ActiveStatusBadge } from "@/shared/ui";

const AddressMiniMap = dynamic(
  () => import("@/shared/components/maps/address-mini-map").then((m) => m.AddressMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[240px] animate-pulse rounded-none bg-slate-100 dark:bg-slate-800" />
    ),
  },
);

export function SiteDetailBody({
  detail,
  dateFmt,
  clientName,
}: {
  detail: Site;
  dateFmt: Intl.DateTimeFormat;
  clientName: string | null;
}) {
  const t = useTranslations("Dashboard.sites");
  const clientId =
    typeof detail.client === "number"
      ? detail.client
      : typeof detail.client?.id === "number"
        ? detail.client.id
        : null;
  const addressParts = {
    line1: detail.address_line_1,
    line2: detail.address_line_2,
    city: detail.city,
    state: detail.state,
    pincode: detail.pincode,
    country: detail.country,
  };

  return (
    <DetailPagePadding>
      <div className="space-y-3.5">
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <div className="grid grid-cols-1 gap-4 sm:max-w-xl">
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
          </div>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionAddress")}>
          <DetailFormattedAddress
            line1={addressParts.line1}
            line2={addressParts.line2}
            city={addressParts.city}
            state={addressParts.state}
            pincode={addressParts.pincode}
            country={addressParts.country}
            emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>}
          />
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionMap")} bodyClassName="p-0">
          <AddressMiniMap
            addressParts={addressParts}
            className="flex min-h-[280px] w-full flex-col lg:min-h-[360px]"
            mapClassName="min-h-[240px] flex-1 rounded-none lg:min-h-[320px]"
          />
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionRecord")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailMetricCard label={t("fields.status")}>
              <ActiveStatusBadge
                active={detail.is_active}
                label={detail.is_active ? t("status.active") : t("status.inactive")}
              />
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.createdAt")}>
              <span className="font-medium tabular-nums">{dateFmt.format(new Date(detail.created_at))}</span>
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.updatedAt")}>
              <span className="font-medium tabular-nums">{dateFmt.format(new Date(detail.modified_at))}</span>
            </DetailMetricCard>
          </div>
        </DetailPanelCard>
      </div>
    </DetailPagePadding>
  );
}
