"use client";

import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Site } from "@/features/sites/types/site.types";
import { routes } from "@/shared/config/routes";
import { DetailFormattedAddress } from "@/shared/components/layout/detail-formatted-address";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { ActiveStatusBadge } from "@/shared/ui";

const AddressMiniMap = dynamic(
  () => import("@/shared/components/maps/address-mini-map").then((m) => m.AddressMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[200px] animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
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
  return (
    <DetailPagePadding>
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <DetailPanelCard title={t("detail.sectionOverview")}>
            <DetailMetricsGrid className="lg:grid-cols-2">
              <DetailMetricCard label={t("fields.siteName")}>
                <span className="break-words">{detail.site_name}</span>
              </DetailMetricCard>
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

          <DetailPanelCard title={t("detail.sectionAddress")}>
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <DetailFormattedAddress
                line1={detail.address_line_1}
                line2={detail.address_line_2}
                city={detail.city}
                state={detail.state}
                pincode={detail.pincode}
                country={detail.country}
                emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>}
              />
              <AddressMiniMap
                addressParts={{
                  line1: detail.address_line_1,
                  line2: detail.address_line_2,
                  city: detail.city,
                  state: detail.state,
                  pincode: detail.pincode,
                  country: detail.country,
                }}
                className="min-h-[200px] lg:min-h-[220px]"
              />
            </div>
          </DetailPanelCard>
        </div>

        <DetailPanelCard title={t("detail.sectionRecord")}>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-400">{t("fields.status")}</span>
              <ActiveStatusBadge
                active={detail.is_active}
                label={detail.is_active ? t("status.active") : t("status.inactive")}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-400">{t("fields.createdAt")}</span>
              <span className="font-medium tabular-nums">{dateFmt.format(new Date(detail.created_at))}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-400">{t("fields.updatedAt")}</span>
              <span className="font-medium tabular-nums">{dateFmt.format(new Date(detail.modified_at))}</span>
            </div>
          </div>
        </DetailPanelCard>
      </div>
    </DetailPagePadding>
  );
}
