"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { DetailEntityLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { ProjectTypeChip } from "@/features/project-types/components/project-type-chip";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import { formatProjectTypeLabel } from "@/features/project-types/utils/project-type-display.util";
import { updateProject } from "@/features/projects/api/project.api";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { getProjectTypeId, resolveProjectTypeChipData } from "@/features/projects/utils/project-type-id.util";
import { fetchUsersPage } from "@/features/users/api/user.api";
import { userProfileLabel } from "@/features/jobs/utils/job-nested-fields.util";
import { routes } from "@/shared/config/routes";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import { DetailMultiValue, DetailMultiValueItem } from "@/shared/components/layout/detail-multi-value";
import {
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

function projectManagerRows(detail: Project): { id: number; label: string }[] {
  const rows: { id: number; label: string }[] = [];
  const seen = new Set<number>();

  const push = (id: number, label: string) => {
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return;
    seen.add(id);
    rows.push({ id, label: label.trim() || `#${id}` });
  };

  if (Array.isArray(detail.manager_detail)) {
    for (const entry of detail.manager_detail) {
      const m = entry?.manager;
      if (!m || typeof m.id !== "number") continue;
      const full = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim();
      const label = full || m.username?.trim() || m.email?.trim() || `#${m.id}`;
      push(m.id, label);
    }
  }

  if (rows.length === 0 && Array.isArray(detail.managers)) {
    for (const entry of detail.managers) {
      if (typeof entry === "number") {
        push(entry, `#${entry}`);
        continue;
      }
      if (entry && typeof entry === "object" && typeof entry.id === "number") {
        push(entry.id, entry.username?.trim() || entry.email?.trim() || `#${entry.id}`);
      }
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
  clientOptions = [],
  projectTypeById = {},
  statusOptions = [],
  siteOptions = [],
  onSaved,
}: {
  detail: Project;
  dateFmt: Intl.DateTimeFormat;
  dateOnlyFmt: Intl.DateTimeFormat;
  clientName: string | null;
  clientOptions?: CheckmarkSelectOption[];
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
  const projectTypeId = getProjectTypeId(detail);
  const projectTypeChip = resolveProjectTypeChipData(detail, projectTypeById);
  const [managerOptions, setManagerOptions] = React.useState<CheckmarkSelectOption[]>([]);

  const clientSelectOptions = React.useMemo(() => {
    const options = [...clientOptions];
    if (clientId != null && clientName && !options.some((o) => o.value === String(clientId))) {
      options.unshift({ value: String(clientId), label: clientName });
    }
    return options;
  }, [clientOptions, clientId, clientName]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchUsersPage(1, 100);
        if (!cancelled) {
          setManagerOptions(items.map((u) => ({ value: String(u.id), label: userProfileLabel(u) })));
        }
      } catch {
        if (!cancelled) setManagerOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const projectTypeSelectOptions = React.useMemo(() => {
    const options = Object.values(projectTypeById).map((row) => ({
      value: String(row.id),
      label: formatProjectTypeLabel(row),
    }));
    if (projectTypeId != null && !options.some((o) => o.value === String(projectTypeId))) {
      options.unshift({
        value: String(projectTypeId),
        label: projectTypeChip ? formatProjectTypeLabel(projectTypeChip) : `Type #${projectTypeId}`,
      });
    }
    return options;
  }, [projectTypeById, projectTypeId, projectTypeChip]);

  const start = detail.start_date?.slice(0, 10) ?? "";
  const end = detail.end_date?.slice(0, 10) ?? "";
  const siteRows = projectSiteListRows(detail, t("fields.site"));
  const managerRows = projectManagerRows(detail);

  const managerSelectOptions = React.useMemo(() => {
    const options = [...managerOptions];
    for (const row of managerRows) {
      if (!options.some((o) => o.value === String(row.id))) {
        options.unshift({ value: String(row.id), label: row.label });
      }
    }
    return options;
  }, [managerOptions, managerRows]);

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
              required
              requiredMessage={t("validation.name")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ name: next.trim() })}
            >
              <span className="break-words">{detail.name}</span>
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.client")}
              value={clientId != null ? String(clientId) : ""}
              kind="select"
              options={clientSelectOptions}
              selectSearchable
              required
              requiredMessage={t("validation.client")}
              editAriaLabel={tActions("edit")}
              onSave={async (next) => {
                const nextId = Number.parseInt(next, 10);
                if (!Number.isFinite(nextId) || nextId <= 0) return;
                // Changing client clears sites (same as create/edit form).
                await patchField({
                  client: nextId,
                  ...(clientId !== nextId ? { sites: [] } : {}),
                });
              }}
            >
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
            </DetailEditableField>
            {projectTypeSelectOptions.length > 0 ? (
              <DetailEditableField
                label={t("fields.projectType")}
                value={projectTypeId != null ? String(projectTypeId) : ""}
                kind="select"
                options={projectTypeSelectOptions}
                selectSearchable
                required
                requiredMessage={t("validation.projectType")}
                editAriaLabel={tActions("edit")}
                onSave={(next) => patchField({ project_type: Number(next) })}
              >
                {projectTypeChip ? <ProjectTypeChip row={projectTypeChip} /> : <span>—</span>}
              </DetailEditableField>
            ) : (
              <DetailMetricCard label={t("fields.projectType")}>
                {projectTypeChip ? <ProjectTypeChip row={projectTypeChip} /> : <span>—</span>}
              </DetailMetricCard>
            )}
            <DetailEditableField
              label={t("fields.startDate")}
              value={start}
              kind="date"
              required
              requiredMessage={t("validation.startDate")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ start_date: next.trim() })}
            >
              {start ? dateOnlyFmt.format(new Date(`${start}T12:00:00`)) : null}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.endDate")}
              value={end}
              kind="date"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ end_date: next.trim() || null })}
            >
              {end ? dateOnlyFmt.format(new Date(`${end}T12:00:00`)) : null}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.manager")}
              className="col-span-full sm:col-span-1"
              kind="multiselect"
              values={managerRows.map((row) => String(row.id))}
              options={managerSelectOptions}
              selectSearchable
              editAriaLabel={tActions("edit")}
              empty="—"
              onSaveValues={(next) =>
                patchField({
                  manager_ids: next.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0),
                })
              }
            >
              <DetailMultiValue>
                {managerRows.map((row) => (
                  <DetailMultiValueItem
                    key={row.id}
                    href={`${routes.dashboard.settingsUsers}/${row.id}`}
                    title={row.label}
                  >
                    {row.label}
                  </DetailMultiValueItem>
                ))}
              </DetailMultiValue>
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.description")}
              value={detail.description ?? ""}
              kind="text"
              multiline
              textareaBox
              required
              requiredMessage={t("validation.description")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ description: next })}
            />
          </DetailMetricsGrid>
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
            <DetailMultiValue>
              {siteRows.map((row) => (
                <DetailMultiValueItem
                  key={row.id}
                  href={`${routes.dashboard.sites}/${row.id}`}
                  title={row.label}
                >
                  {row.label}
                </DetailMultiValueItem>
              ))}
            </DetailMultiValue>
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
