"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { DetailEntityLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { ProjectTypeChip } from "@/features/project-types/components/project-type-chip";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import { updateProject } from "@/features/projects/api/project.api";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { resolveProjectTypeChipData } from "@/features/projects/utils/project-type-id.util";
import { routes } from "@/shared/config/routes";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import {
  DetailFieldsLayout,
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { useDetailPatch } from "@/shared/hooks/use-entity-detail-screen";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";

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

function resolveProjectStatusId(detail: Project): string {
  const status = detail.project_status;
  if (typeof status === "object" && status !== null && typeof status.id === "number") {
    return String(status.id);
  }
  if (typeof status === "number" && Number.isFinite(status)) {
    return String(status);
  }
  return "";
}

export function ProjectDetailBody({
  detail,
  dateFmt,
  dateOnlyFmt,
  clientName,
  projectTypeById = {},
  statusOptions = [],
  siteOptions = [],
  onSaved,
}: {
  detail: Project;
  dateFmt: Intl.DateTimeFormat;
  dateOnlyFmt: Intl.DateTimeFormat;
  clientName: string | null;
  projectTypeById?: Record<number, ProjectType>;
  statusOptions?: WorkflowColourStatus[];
  siteOptions?: CheckmarkSelectOption[];
  /** Refresh detail after a successful quick-edit PATCH. */
  onSaved?: () => void;
}) {
  const t = useTranslations("Dashboard.projects");
  const tMeta = useTranslations("Dashboard.common.detail");
  const tActions = useTranslations("Dashboard.common.actions");
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

  const projectStatusSelectOptions = React.useMemo(
    () => statusOptions.map((s) => ({ value: String(s.id), label: s.status_name })),
    [statusOptions],
  );

  const patchField = useDetailPatch(
    (body: Parameters<typeof updateProject>[1]) => updateProject(detail.id, body),
    { success: t("updatedToast"), error: t("toggleActiveError") },
    onSaved,
  );

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <DetailMetricsGrid>
            {projectStatusSelectOptions.length > 0 ? (
              <DetailEditableField
                label={t("table.status")}
                value={resolveProjectStatusId(detail)}
                kind="select"
                options={projectStatusSelectOptions}
                editAriaLabel={tActions("edit")}
                onSave={(next) => patchField({ project_status: Number(next) })}
              >
                <WorkflowColourStatusChip row={statusChip} fallbackLabel="—" />
              </DetailEditableField>
            ) : (
              <DetailMetricCard label={t("table.status")}>
                <WorkflowColourStatusChip row={statusChip} fallbackLabel="—" />
              </DetailMetricCard>
            )}
            <DetailEditableField
              label={t("fields.name")}
              value={detail.name}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ name: next.trim() })}
            >
              <span className="break-words">{detail.name}</span>
            </DetailEditableField>
            <DetailMetricCard label={t("fields.client")}>
              {clientId ? (
                <DetailEntityLink
                  href={`${routes.dashboard.clients}/${clientId}`}
                  className="break-words text-blue-600 underline-offset-2 hover:underline"
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
            <DetailEditableField
              label={t("fields.startDate")}
              value={start}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ start_date: next.trim() })}
            >
              {start ? dateOnlyFmt.format(new Date(`${start}T12:00:00`)) : null}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.endDate")}
              value={end}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ end_date: next.trim() || null })}
            >
              {end ? dateOnlyFmt.format(new Date(`${end}T12:00:00`)) : null}
            </DetailEditableField>
            <DetailMetricCard label={t("fields.manager")}>
              {(detail.manager_detail ?? []).map((manager, index) => (
                <span key={index}>
                  {manager?.manager?.username} {" "}
                  {index === (detail.manager_detail?.length ?? 0) - 1 ? " " : ","}
                </span>
              ))}
            </DetailMetricCard>
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.panelDescription")}>
          <DetailFieldsLayout>
            <DetailEditableField
              label={<span className="sr-only">{t("fields.description")}</span>}
              value={detail.description ?? ""}
              kind="text"
              multiline
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ description: next })}
            >
              {detail.description?.trim() ? (
                <span className="whitespace-pre-wrap font-normal leading-relaxed">{detail.description}</span>
              ) : null}
            </DetailEditableField>
          </DetailFieldsLayout>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.panelSites")}>
          <DetailEditableField
            label={t("fields.sites")}
            kind="multiselect"
            values={siteRows.map((row) => String(row.id))}
            options={siteOptions}
            editAriaLabel={tActions("edit")}
            empty="—"
            onSaveValues={(next) =>
              patchField({
                sites: next.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0),
              })
            }
          >
            {siteRows.length === 0 ? null : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {siteRows.map((row) => (
                  <li key={row.id} className="min-w-0 border-t border-slate-200/80 pt-3 first:border-t-0 first:pt-0 dark:border-slate-800">
                    <DetailEntityLink
                      href={`${routes.dashboard.sites}/${row.id}`}
                      className="block min-w-0 font-semibold text-blue-600 underline-offset-2 hover:underline"
                    >
                      <span className="break-words">{row.label}</span>
                    </DetailEntityLink>
                  </li>
                ))}
              </ul>
            )}
          </DetailEditableField>
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
