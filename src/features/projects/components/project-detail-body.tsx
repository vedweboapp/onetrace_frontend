"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Project } from "@/features/projects/types/project.types";
import { routes } from "@/shared/config/routes";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { ActiveStatusBadge } from "@/shared/ui";

export function ProjectDetailBody({
  detail,
  dateFmt,
  dateOnlyFmt,
  clientName,
}: {
  detail: Project;
  dateFmt: Intl.DateTimeFormat;
  dateOnlyFmt: Intl.DateTimeFormat;
  clientName: string | null;
}) {
  const t = useTranslations("Dashboard.projects");
  const line1 = detail.address_line_1?.trim() ?? "";
  const line2 = detail.address_line_2?.trim() ?? "";
  const structured =
    !!(line1 || line2 || detail.city?.trim() || detail.state?.trim() || detail.country?.trim() || detail.pincode?.trim());

  const start = detail.start_date?.slice(0, 10) ?? "";
  const end = detail.end_date?.slice(0, 10) ?? "";

  return (
    <DetailPagePadding>
      <DetailPanelCard title={t("detail.panelDescription")}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          {detail.description?.trim() ? detail.description : "—"}
        </p>
      </DetailPanelCard>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <DetailPanelCard title={t("detail.panelBasicInfo")}>
            <DetailMetricsGrid className="lg:grid-cols-2">
              <DetailMetricCard label={t("fields.name")}>
                <span className="break-words">{detail.name}</span>
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.client")}>
                <Link
                  href={`${routes.dashboard.clients}/${detail.client}`}
                  className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {clientName ?? `#${detail.client}`}
                </Link>
              </DetailMetricCard>
              <div className="sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                  {t("table.status")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ActiveStatusBadge
                    active={detail.is_active}
                    label={detail.is_active ? t("status.active") : t("status.inactive")}
                  />
                  {detail.status ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {detail.status}
                    </span>
                  ) : null}
                </div>
              </div>
            </DetailMetricsGrid>
          </DetailPanelCard>

          <DetailPanelCard title={t("detail.panelTimeline")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailMetricCard label={t("fields.startDate")}>
                {start ? dateOnlyFmt.format(new Date(`${start}T12:00:00`)) : "—"}
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.endDate")}>
                {end ? dateOnlyFmt.format(new Date(`${end}T12:00:00`)) : "—"}
              </DetailMetricCard>
            </div>
          </DetailPanelCard>
        </div>

        <div className="space-y-5">
          <DetailPanelCard title={t("detail.panelSystemActivity")}>
            <DetailMetricsGrid className="lg:grid-cols-1">
              <DetailMetricCard label={t("fields.createdAt")}>
                <span className="font-medium tabular-nums">{dateFmt.format(new Date(detail.created_at))}</span>
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.updatedAt")}>
                <span className="font-medium tabular-nums">{dateFmt.format(new Date(detail.modified_at))}</span>
              </DetailMetricCard>
              {detail.created_by ? (
                <DetailMetricCard label={t("fields.createdBy")}>
                  <span className="block font-medium">{detail.created_by.username}</span>
                  <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">
                    {detail.created_by.email}
                  </span>
                </DetailMetricCard>
              ) : null}
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
      </div>
    </DetailPagePadding>
  );
}
