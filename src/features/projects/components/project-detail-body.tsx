"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { routes } from "@/shared/config/routes";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { ActiveStatusBadge } from "@/shared/ui";

function projectSiteListRows(detail: Project): { id: number; label: string; isActive?: boolean }[] {
  const sites = detail.sites;
  if (!Array.isArray(sites) || sites.length === 0) return [];
  const rows: { id: number; label: string; isActive?: boolean }[] = [];
  for (const entry of sites) {
    if (typeof entry === "number" && Number.isFinite(entry) && entry > 0) {
      rows.push({ id: entry, label: `#${entry}` });
    } else if (entry && typeof entry === "object" && typeof entry.id === "number") {
      const name = entry.site_name?.trim();
      rows.push({
        id: entry.id,
        label: name || `#${entry.id}`,
        isActive: typeof entry.is_active === "boolean" ? entry.is_active : undefined,
      });
    }
  }
  return rows;
}

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
  const clientId = getProjectClientId(detail);

  const start = detail.start_date?.slice(0, 10) ?? "";
  const end = detail.end_date?.slice(0, 10) ?? "";
  const siteRows = projectSiteListRows(detail);

  return (
    <DetailPagePadding>
      <DetailPanelCard title={t("detail.panelDescription")}>
        {detail.description?.trim() ? (
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/40">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              {detail.description}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">—</p>
        )}
      </DetailPanelCard>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <DetailPanelCard title={t("detail.panelBasicInfo")}>
            <DetailMetricsGrid className="lg:grid-cols-2">
              <DetailMetricCard label={t("fields.name")}>
                <span className="break-words">{detail.name}</span>
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

          <DetailPanelCard title={t("detail.panelSites")}>
            {siteRows.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.sitesEmpty")}</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {siteRows.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`${routes.dashboard.sites}/${row.id}`}
                      className="min-w-0 font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                    >
                      <span className="break-words">{row.label}</span>
                    </Link>
                    {typeof row.isActive === "boolean" ? (
                      <ActiveStatusBadge
                        active={row.isActive}
                        label={row.isActive ? t("status.active") : t("status.inactive")}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </DetailPanelCard>
        </div>
      </div>
    </DetailPagePadding>
  );
}
