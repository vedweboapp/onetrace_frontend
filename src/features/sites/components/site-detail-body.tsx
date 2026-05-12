"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Site } from "@/features/sites/types/site.types";
import { routes } from "@/shared/config/routes";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { ActiveStatusBadge } from "@/shared/ui";

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
  const line1 = detail.address_line_1?.trim() ?? "";
  const line2 = detail.address_line_2?.trim() ?? "";
  const structured =
    !!(line1 || line2 || detail.city?.trim() || detail.state?.trim() || detail.country?.trim() || detail.pincode?.trim());

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
                <Link
                  href={`${routes.dashboard.clients}/${detail.client}`}
                  className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {clientName ?? `#${detail.client}`}
                </Link>
              </DetailMetricCard>
            </DetailMetricsGrid>
          </DetailPanelCard>

          <DetailPanelCard title={t("detail.sectionAddress")}>
            {structured ? (
              <div className="grid gap-3 text-sm leading-relaxed text-slate-800 sm:grid-cols-2 dark:text-slate-200">
                <div className="space-y-2">
                  {line1 ? <p>{line1}</p> : null}
                  {line2 ? <p>{line2}</p> : null}
                </div>
                <div className="space-y-2">
                  <p>{[detail.city?.trim(), detail.state?.trim()].filter(Boolean).join(", ") || "—"}</p>
                  <p>{[detail.country?.trim(), detail.pincode?.trim()].filter(Boolean).join(" · ") || "—"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>
            )}
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
