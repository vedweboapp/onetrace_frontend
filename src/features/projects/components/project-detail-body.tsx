"use client";

import { useTranslations } from "next-intl";
import { DetailEntityLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { ProjectTypeChip } from "@/features/project-types/components/project-type-chip";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { resolveProjectTypeChipData } from "@/features/projects/utils/project-type-id.util";
import { routes } from "@/shared/config/routes";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";

function projectSiteListRows(
  detail: Project,
  siteLabel: string,
): { id: number; label: string }[] {
  const sites = detail.sites;
  if (!Array.isArray(sites) || sites.length === 0) return [];
  const rows: { id: number; label: string }[] = [];
  for (const entry of sites) {
    if (typeof entry === "number" && Number.isFinite(entry) && entry > 0) {
      rows.push({ id: entry, label: siteLabel });
    } else if (entry && typeof entry === "object" && typeof entry.id === "number") {
      const name = entry.site_name?.trim();
      rows.push({
        id: entry.id,
        label: name || siteLabel,
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
  projectTypeById = {},
}: {
  detail: Project;
  dateFmt: Intl.DateTimeFormat;
  dateOnlyFmt: Intl.DateTimeFormat;
  clientName: string | null;
  projectTypeById?: Record<number, ProjectType>;
}) {
  const t = useTranslations("Dashboard.projects");
  const tMeta = useTranslations("Dashboard.common.detail");
  const clientId = getProjectClientId(detail);
  const projectTypeChip = resolveProjectTypeChipData(detail, projectTypeById);

  const start = detail.start_date?.slice(0, 10) ?? "";
  const end = detail.end_date?.slice(0, 10) ?? "";
  const siteRows = projectSiteListRows(detail, t("fields.site"));

  const projectStatus =
    typeof detail.project_status === "object" && detail.project_status !== null
      ? detail.project_status
      : undefined;

  const statusChip = projectStatus
    ? {
        status_name: projectStatus.name?.trim() || "—",
        bg_colour: projectStatus.bg_color ?? "#e2e8f0",
        text_colour: projectStatus.text_color ?? "#0f172a",
      }
    : null;

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <DetailMetricsGrid className="sm:grid-cols-2 lg:grid-cols-3">
            <DetailMetricCard label={t("table.status")}>
              <WorkflowColourStatusChip row={statusChip} fallbackLabel="—" />
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.name")}>
              <span className="break-words">{detail.name}</span>
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.client")}>
              {clientId ? (
                <DetailEntityLink
                  href={`${routes.dashboard.clients}/${clientId}`}
                  className="break-words text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {clientName ?? "—"}
                </DetailEntityLink>
              ) : (
                <span className="break-words text-slate-700 dark:text-slate-200">{clientName ?? "—"}</span>
              )}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.projectType")}>
              {projectTypeChip ? <ProjectTypeChip row={projectTypeChip} /> : <span>—</span>}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.startDate")}>
              {start ? dateOnlyFmt.format(new Date(`${start}T12:00:00`)) : "—"}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.endDate")}>
              {end ? dateOnlyFmt.format(new Date(`${end}T12:00:00`)) : "—"}
            </DetailMetricCard>
            {/* {detail.status ? (
              <DetailMetricCard label={t("table.status")}>
                <span className="inline-flex max-w-full truncate rounded-full border border-black/10 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                  {detail.status}
                </span>
              </DetailMetricCard>
            ) : null} */}
            <DetailMetricCard label={t("fields.manager")}>
              {detail.manager_detail?.map((manager,index)=>(
                <span key={index}>
                  {manager?.manager?.username } {" "}
                  {index == detail.manager_detail?.length -1 ? " ": ","}
                </span>
              ))}
            </DetailMetricCard>
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.panelDescription")}>
          {detail.description?.trim() ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {detail.description}
            </p>
          ) : (
            <p className="text-sm font-normal text-slate-500 dark:text-slate-400">—</p>
          )}
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.panelSites")}>
          {siteRows.length === 0 ? (
            <p className="text-sm font-normal text-slate-500 dark:text-slate-400">{t("detail.sitesEmpty")}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {siteRows.map((row) => (
                <li key={row.id} className="min-w-0 border-t border-slate-200/80 pt-3 first:border-t-0 first:pt-0 dark:border-slate-800">
                  <DetailEntityLink
                    href={`${routes.dashboard.sites}/${row.id}`}
                    className="block min-w-0 font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                  >
                    <span className="break-words">{row.label}</span>
                  </DetailEntityLink>
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
