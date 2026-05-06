"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Project } from "@/features/projects/types/project.types";
import { routes } from "@/shared/config/routes";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailSectionTitle,
  DetailWideCard,
} from "@/shared/components/layout/detail-metric-card";
import { cn } from "@/core/utils/http.util";

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
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
            detail.is_active
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
          )}
        >
          {detail.is_active ? t("status.active") : t("status.inactive")}
        </span>
        {detail.status ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {detail.status}
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        <DetailSectionTitle>{t("detail.sectionOverview")}</DetailSectionTitle>
        <DetailMetricsGrid>
          <DetailMetricCard label={t("fields.name")}>
            <span className="break-words font-semibold">{detail.name}</span>
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.client")}>
            <Link
              href={`${routes.dashboard.clients}/${detail.client}`}
              className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
            >
              {clientName ?? `#${detail.client}`}
            </Link>
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.startDate")}>
            {start ? dateOnlyFmt.format(new Date(`${start}T12:00:00`)) : "—"}
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.endDate")}>
            {end ? dateOnlyFmt.format(new Date(`${end}T12:00:00`)) : "—"}
          </DetailMetricCard>
        </DetailMetricsGrid>
        <DetailWideCard label={t("fields.description")}>
          <span className="block whitespace-pre-wrap font-normal">{detail.description || "—"}</span>
        </DetailWideCard>
      </div>

      <div className="space-y-3">
        <DetailSectionTitle>{t("detail.sectionAddress")}</DetailSectionTitle>
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/60">
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
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-6 dark:border-slate-800">
        <DetailSectionTitle>{t("detail.sectionRecord")}</DetailSectionTitle>
        <DetailMetricsGrid>
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
      </div>
    </DetailPagePadding>
  );
}
